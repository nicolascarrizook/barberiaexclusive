import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User, Phone, Mail, MessageSquare, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(8, "El teléfono debe tener al menos 8 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CustomerFormV2Props {
  onSubmit: (data: FormData) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function CustomerFormV2({ onSubmit, onBack, isSubmitting = false }: CustomerFormV2Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const inputVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          Datos de contacto
        </h2>
        <p className="text-muted-foreground">
          Por favor, completa tus datos para confirmar la reserva
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6">
          {/* Name field */}
          <motion.div
            variants={inputVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
          >
            <div>
              <Label htmlFor="name" className="block mb-2">
                Nombre completo
              </Label>
              <Input
                id="name"
                placeholder="Juan Pérez"
                {...register("name")}
                className={cn(
                  errors.name && "border-destructive focus:ring-destructive"
                )}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
          </motion.div>

          {/* Phone field */}
          <motion.div
            variants={inputVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.2 }}
          >
            <div>
              <Label htmlFor="phone" className="block mb-2">
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="11 2345 6789"
                {...register("phone")}
                className={cn(
                  errors.phone && "border-destructive focus:ring-destructive"
                )}
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </motion.div>

          {/* Email field (optional) */}
          <motion.div
            variants={inputVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.3 }}
          >
            <div>
              <Label htmlFor="email" className="block mb-2">
                Email <span className="text-sm text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="juan@email.com"
                {...register("email")}
                className={cn(
                  errors.email && "border-destructive focus:ring-destructive"
                )}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
          </motion.div>

          {/* Notes field (optional) */}
          <motion.div
            variants={inputVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.4 }}
          >
            <div>
              <Label htmlFor="notes" className="block mb-2">
                Notas adicionales <span className="text-sm text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Alguna preferencia o indicación especial..."
                {...register("notes")}
                className="min-h-[80px] resize-none"
                rows={3}
              />
            </div>
          </motion.div>
        </div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3 pt-4"
        >
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Atrás
          </Button>
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Confirmando...
              </>
            ) : (
              "Confirmar reserva"
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}