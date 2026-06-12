'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Medicine } from '@/types';

const medicineSchema = z.object({
  name: z.string().min(1, 'Name is required'),
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MedicineFormData>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      unit: defaultValues?.unit || 'packs',
      currentStock: defaultValues?.currentStock || 0,
      reorderThreshold: defaultValues?.reorderThreshold || 10,
      reorderQuantity: defaultValues?.reorderQuantity || 50,
      expiryDate: defaultValues?.expiryDate || '',
      costPerUnit: defaultValues?.costPerUnit || 0,
      isBig5: defaultValues?.isBig5 || false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Medicine Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="unit">Unit</Label>
        <Input id="unit" {...register('unit')} />
        {errors.unit && (
          <p className="text-sm text-red-500">{errors.unit.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="currentStock">Current Stock</Label>
          <Input
            id="currentStock"
            type="number"
            {...register('currentStock')}
          />
          {errors.currentStock && (
            <p className="text-sm text-red-500">
              {errors.currentStock.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
          <Input
            id="reorderThreshold"
            type="number"
            {...register('reorderThreshold')}
          />
          {errors.reorderThreshold && (
            <p className="text-sm text-red-500">
              {errors.reorderThreshold.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
          <Input
            id="reorderQuantity"
            type="number"
            {...register('reorderQuantity')}
          />
          {errors.reorderQuantity && (
            <p className="text-sm text-red-500">
              {errors.reorderQuantity.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="costPerUnit">Cost Per Unit (Le)</Label>
          <Input
            id="costPerUnit"
            type="number"
            step="0.01"
            {...register('costPerUnit')}
          />
          {errors.costPerUnit && (
            <p className="text-sm text-red-500">
              {errors.costPerUnit.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="expiryDate">Expiry Date</Label>
        <Input id="expiryDate" type="date" {...register('expiryDate')} />
        {errors.expiryDate && (
          <p className="text-sm text-red-500">{errors.expiryDate.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
