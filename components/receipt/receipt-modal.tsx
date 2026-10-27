"use client";

import { MessageCircle, Plus, Printer } from "lucide-react";

import { Receipt } from "@/components/receipt/receipt";
import { ReceiptSizeToggle } from "@/components/receipt/receipt-size-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReceiptSize } from "@/lib/hooks/use-receipt-size";
import { openReceiptWhatsApp } from "@/lib/whatsapp";
import type { Order } from "@/lib/types";

export function ReceiptModal({
  order,
  open,
  onOpenChange,
  onNewOrder,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewOrder?: () => void;
}) {
  const [receiptSize, setReceiptSize] = useReceiptSize();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader className="no-print">
            <DialogTitle>Nota Transaksi</DialogTitle>
            <DialogDescription>
              Pesanan #{order?.receipt_number ?? "-"} berhasil disimpan.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto bg-stone-100 px-4 py-4">
            {order ? <Receipt order={order} /> : null}
          </div>

          <DialogFooter className="no-print">
            <div className="flex w-full items-center justify-center gap-2 pb-1 sm:mr-auto sm:w-auto sm:justify-start">
              <span className="text-xs font-medium text-muted-foreground">Ukuran cetak</span>
              <ReceiptSizeToggle value={receiptSize} onChange={setReceiptSize} />
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <Button variant="outline" onClick={() => order && openReceiptWhatsApp(order)}>
                <MessageCircle className="size-4" /> Kirim WA
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" /> Cetak PDF
              </Button>
            </div>
            <Button
              onClick={() => {
                onOpenChange(false);
                onNewOrder?.();
              }}
            >
              <Plus className="size-4" /> Pesanan Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print-only copy, outside the dialog so nothing clips it. */}
      {order ? (
        <>
          <style>{`@media print { @page { size: ${receiptSize}mm auto; margin: 2mm; } }`}</style>
          <div className="hidden print:block">
            <Receipt order={order} className={`receipt-print receipt-${receiptSize}`} />
          </div>
        </>
      ) : null}
    </>
  );
}
