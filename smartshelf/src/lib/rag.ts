import { prisma } from './prisma';
import { embeddingsSearch, NAMESPACE } from './geneline';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function generateResponse(message: string, pharmacyId?: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    return 'OpenAI is not configured. Set OPENAI_API_KEY in your environment.';
  }

  try {
    // 1. Fetch Inventory Context (scoped to pharmacy if provided)
    const medicines = await prisma.medicine.findMany({
      where: pharmacyId ? { pharmacyId } : undefined,
      orderBy: { name: 'asc' },
      select: {
        name: true,
        unit: true,
        currentStock: true,
        reorderThreshold: true,
        reorderQuantity: true,
        expiryDate: true,
        costPerUnit: true,
        ...(!pharmacyId ? { pharmacy: { select: { name: true } } } : {}),
      },
    });

    // 2. Fetch STG Context via Geneline Vector Search
    let stgContext = '';
    try {
      const searchResult = await embeddingsSearch({
        query: message,
        namespace: NAMESPACE,
        topK: 3,
      });

      if (searchResult.matches && searchResult.matches.length > 0) {
        stgContext = searchResult.matches
          .map((m) => m.metadata?.text || m.metadata?.content || '')
          .filter(Boolean)
          .join('\n\n---\n\n');
      }
    } catch (err) {
      console.error('STG Search error:', err);
    }

    const totalMeds = medicines.length;
    const totalStock = medicines.reduce((s, m) => s + m.currentStock, 0);
    const lowStock = medicines.filter((m) => m.currentStock <= m.reorderThreshold);
    const totalValue = medicines.reduce((s, m) => s + m.currentStock * m.costPerUnit, 0);

    const inventoryTable = medicines
      .map(
        (m: any) =>
          `${m.pharmacy ? `[${m.pharmacy.name}] ` : ''}- ${m.name}: ${m.currentStock} ${m.unit} (threshold: ${m.reorderThreshold}, reorder qty: ${m.reorderQuantity}, expires: ${m.expiryDate}, cost: Le ${m.costPerUnit})`
      )
      .join('\n');

    // 3. Platform Overview (for super admin — no pharmacy scoping)
    let platformOverview = '';
    if (!pharmacyId) {
      const totalUsers = await prisma.user.count();
      const totalPharmacies = await prisma.pharmacy.count();
      const platformMeds = await prisma.medicine.count();
      platformOverview = `
---
PLATFORM OVERVIEW:
- Total users: ${totalUsers}
- Total pharmacies: ${totalPharmacies}
- Total medicines across all pharmacies: ${platformMeds}
---`;
    }

    const systemPrompt = `You are SmartShelf Assistant, a medical and inventory chatbot for pharmacies in Sierra Leone. Your primary goal is to help staff manage inventory and provide GROUNDED treatment advice based on official guidelines.

--- 
STG CONTEXT (Official Sierra Leone Standard Treatment Guidelines):
${stgContext || 'No specific guideline snippets found for this query.'}
---

---
INVENTORY CONTEXT:
- Total medicines: ${totalMeds}
- Total units in stock: ${totalStock}
- Low stock items: ${lowStock.length}
- Total inventory value: Le ${totalValue.toLocaleString()}

Full inventory:
${inventoryTable}
---${platformOverview}

Instructions:
1. INVENTORY: Answer questions about stock levels, expiry dates, and restock needs using the INVENTORY CONTEXT.
2. MEDICAL ADVICE: If asked about treatment or prescription, ONLY use the STG CONTEXT provided. 
   - If the STG CONTEXT contains relevant information, summarize it clearly.
   - If the STG CONTEXT is missing or irrelevant for a medical query, say: "I couldn't find official guidance for this in the Standard Treatment Guidelines. Please consult a senior pharmacist."
   - ALWAYS remind them that this is for guidance only and doesn't replace professional judgment.
3. STYLE: Keep answers concise, professional, and friendly. Use emojis sparingly. Format medicine names in *bold*.
4. CURRENCY: Prices are in Sierra Leonean Leones (Le).
5. PLATFORM OVERVIEW: If the PLATFORM OVERVIEW section is present, answer questions about total users, pharmacies, and platform stats using that data. If asked for a pharmacy-specific question but no pharmacy is scoped, explain that they can see all pharmacies' data but specify the pharmacy name when discussing specific stock.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenAI error:', err);
      if (res.status === 401) {
        return 'OpenAI API key is invalid or expired. Ask an admin to check the key.';
      }
      if (res.status === 429) {
        return 'OpenAI is rate-limited (too many requests). Please wait a moment and try again.';
      }
      if (res.status === 403) {
        return 'OpenAI API key does not have access to gpt-4o-mini. Check billing and model access.';
      }
      return `OpenAI error (${res.status}). Please try again.`;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (err) {
    console.error('Query error:', err);
    return 'Sorry, I hit an error. Try again.';
  }
}
