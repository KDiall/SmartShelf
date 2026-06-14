'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Medicine } from '@/types';
import { UploadButton } from '@/lib/uploadthing';
import { Image as ImageIcon, X, CheckCircle2, Loader2 } from 'lucide-react';

const medicineSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  image: z.string().optional().nullable(),
  unit: z.string().min(1, 'Unit is required'),
  currentStock: z.coerce.number().min(0, 'Must be 0 or more'),
  reorderThreshold: z.coerce.number().min(1, 'Must be at least 1'),
  reorderQuantity: z.coerce.number().min(1, 'Must be at least 1'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  costPerUnit: z.coerce.number().min(0, 'Must be 0 or more'),
  isBig5: z.boolean(),
});

type MedicineFormData = z.infer<typeof medicineSchema>;

interface Props {
  defaultValues?: Partial<Medicine>;
  onSubmit: (data: MedicineFormData) => Promise<void>;
  submitLabel?: string;
}

export function MedicineForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: Props) {
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MedicineFormData>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      image: defaultValues?.image || null,
      unit: defaultValues?.unit || 'packs',
      currentStock: defaultValues?.currentStock || 0,
      reorderThreshold: defaultValues?.reorderThreshold || 10,
      reorderQuantity: defaultValues?.reorderQuantity || 50,
      expiryDate: defaultValues?.expiryDate || '',
      costPerUnit: defaultValues?.costPerUnit || 0,
      isBig5: defaultValues?.isBig5 || false,
    },
  });

  const imageUrl = watch('image');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label>Medicine Image</Label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-secondary/50 border border-border flex items-center justify-center overflow-hidden shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <UploadButton
              endpoint="medicineImageUploader"
              input={{ token: localStorage.getItem('token') ?? '' }}
              onUploadBegin={() => setUploading(true)}
              onClientUploadComplete={(res) => {
                setUploading(false);
                if (res?.[0]) {
                  setValue('image', res[0].ufsUrl ?? res[0].url);
                }
              }}
              onUploadError={(error: Error) => {
                setUploading(false);
                alert(`Upload failed: ${error.message}`);
              }}
              appearance={{
                button: {
                  background: '#0284c7',
                  borderRadius: '0.75rem',
                  height: '2.5rem',
                  width: '100%',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                },
                allowedContent: { display: 'none' },
              }}
            />
            {uploading && (
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#0284c7]" />
                <span className="text-xs font-medium">Uploading image...</span>
              </div>
            )}
            {imageUrl && (
              <div className="mt-2 flex items-center gap-1.5 text-[#10b981]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Image Uploaded</span>
              </div>
            )}
          </div>
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setValue('image', null)}
              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="name">Medicine Name</Label>
        <Input id="name" {...register('name')} placeholder="e.g. Paracetamol" className="rounded-xl" />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="unit">Unit (e.g. packs, vials)</Label>
        <Input id="unit" {...register('unit')} className="rounded-xl" />
        {errors.unit && (
          <p className="text-sm text-red-500 mt-1">{errors.unit.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="currentStock">Current Stock</Label>
          <Input
            id="currentStock"
            type="number"
            {...register('currentStock')}
            className="rounded-xl"
          />
          {errors.currentStock && (
            <p className="text-sm text-red-500">{errors.currentStock.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="reorderThreshold">Threshold</Label>
          <Input
            id="reorderThreshold"
            type="number"
            {...register('reorderThreshold')}
            className="rounded-xl"
          />
          {errors.reorderThreshold && (
            <p className="text-sm text-red-500">{errors.reorderThreshold.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="reorderQuantity">Reorder Qty</Label>
          <Input
            id="reorderQuantity"
            type="number"
            {...register('reorderQuantity')}
            className="rounded-xl"
          />
          {errors.reorderQuantity && (
            <p className="text-sm text-red-500">{errors.reorderQuantity.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="costPerUnit">Cost (Le)</Label>
          <Input
            id="costPerUnit"
            type="number"
            step="0.01"
            {...register('costPerUnit')}
            className="rounded-xl"
          />
          {errors.costPerUnit && (
            <p className="text-sm text-red-500">{errors.costPerUnit.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="expiryDate">Expiry Date</Label>
        <Input id="expiryDate" type="date" {...register('expiryDate')} className="rounded-xl" />
        {errors.expiryDate && (
          <p className="text-sm text-red-500 mt-1">{errors.expiryDate.message}</p>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          {...register('isBig5')}
          className="h-5 w-5 rounded border-gray-300 text-[#0284c7] focus:ring-[#0284c7]"
        />
        <span className="text-sm font-medium">Mark as Quick-Sale item (Big 5)</span>
      </label>

      <Button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl bg-[#0284c7] hover:bg-[#0284c7]/90 shadow-md shadow-sky-100">
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
