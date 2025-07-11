import { useEffect, useState } from 'react';
import { Dialog, DialogContent, TextField, Button, Box, Typography } from '@mui/material';
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams } from 'react-router-dom';

interface ItemRow { 
  id?: string; 
  item: string; 
  qtyEnt: number; 
  qtyRec: number;
  qtyEntregada?: number;
  qtyRecibida?: number;
}

interface DeliveriesDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  res: any;
  mode: 'entrega' | 'recepcion';
}

export default function DeliveriesDialog({ open, setOpen, res, mode }: DeliveriesDialogProps) {
  const { hotel } = useParams<{ hotel: string }>();
  const [rows, setRows] = useState<ItemRow[]>([{ item: 'Toallas', qtyEnt: 0, qtyRec: 0 }]);

  // Load existing items when in reception mode
  useEffect(() => {
    if (!open || mode === 'entrega') return;
    
    async function load() {
      if (!hotel || !res?.id) return;
      
      try {
        const snap = await getDocs(
          collection(db, `hotels/${hotel}/reservations/${res.id}/deliveries`)
        );
        const items = snap.docs.map(doc => ({
          id: doc.id,
          item: doc.data().item,
          qtyEnt: doc.data().qtyEntregada || 0,
          qtyRec: doc.data().qtyRecibida || 0
        }));
        setRows(items.length > 0 ? items : [{ item: 'Toallas', qtyEnt: 0, qtyRec: 0 }]);
      } catch (error) {
        console.error('Error loading deliveries:', error);
      }
    }
    
    load();
  }, [open, mode, hotel, res?.id]);

  const addRow = () => setRows([...rows, { item: '', qtyEnt: 0, qtyRec: 0 }]);
  
  const setField = (i: number, key: keyof ItemRow, val: any) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  const save = async () => {
    if (!hotel || !res?.id) return;
    
    try {
      const col = collection(db, `hotels/${hotel}/reservations/${res.id}/deliveries`);
      
      // Save each row
      for (const r of rows) {
        if (mode === 'entrega') {
          await addDoc(col, { 
            item: r.item, 
            qtyEntregada: Number(r.qtyEnt) || 0, 
            qtyRecibida: 0 
          });
        } else if (r.id) {
          await updateDoc(doc(col, r.id), { 
            qtyRecibida: Number(r.qtyRec) || 0 
          });
        }
      }
      
      // Update missing status in reception mode
      if (mode === 'recepcion') {
        const hasMissing = rows.some(r => (r.qtyRec || 0) < (r.qtyEnt || 0));
        await updateDoc(doc(db, `hotels/${hotel}/reservations/${res.id}`), { 
          missing: hasMissing 
        });
      }
      
      setOpen(false);
    } catch (error) {
      console.error('Error saving deliveries:', error);
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogContent>
        <Typography variant="h6" gutterBottom>
          {mode === 'entrega' ? 'Entrega de habitación' : 'Recepción de habitación'}
        </Typography>
        
        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          {rows.map((row, i) => (
            <Box key={i} display="flex" gap={1} alignItems="center">
              <TextField
                label="Artículo"
                value={row.item}
                onChange={(e) => setField(i, 'item', e.target.value)}
                fullWidth
                disabled={mode === 'recepcion'}
              />
              
              {mode === 'entrega' ? (
                <TextField
                  label="Cantidad"
                  type="number"
                  value={row.qtyEnt}
                  onChange={(e) => setField(i, 'qtyEnt', e.target.value)}
                  sx={{ minWidth: 120 }}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              ) : (
                <>
                  <TextField
                    label="Entregadas"
                    type="number"
                    value={row.qtyEnt}
                    disabled
                    sx={{ minWidth: 120 }}
                  />
                  <TextField
                    label="Recibidas"
                    type="number"
                    value={row.qtyRec}
                    onChange={(e) => setField(i, 'qtyRec', e.target.value)}
                    sx={{ minWidth: 120 }}
                    InputProps={{ inputProps: { min: 0 } }}
                    error={(row.qtyRec || 0) < (row.qtyEnt || 0)}
                    helperText={(row.qtyRec || 0) < (row.qtyEnt || 0) ? 'Faltan ítems' : ''}
                  />
                </>
              )}
            </Box>
          ))}
          
          {mode === 'entrega' && (
            <Button variant="outlined" onClick={addRow} sx={{ mt: 1 }}>
              Añadir ítem
            </Button>
          )}
          
          <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={save}>
              Guardar
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
