import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  Typography,
  Box
} from '@mui/material';
import { serverTimestamp, doc, collection, runTransaction, increment } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, method: string) => Promise<void>;
  maxAmount: number;
}

export default function PaymentDialog({ 
  open, 
  onClose, 
  onSubmit,
  maxAmount
}: PaymentDialogProps) {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>('Efectivo');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (amount <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }

    if (amount > maxAmount) {
      setError(`El monto no puede ser mayor a $${maxAmount.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(amount, method);
      onClose();
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Error al procesar el pago. Por favor, intente nuevamente.');
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
    { value: 'Tarjeta de Débito', label: 'Tarjeta de Débito' },
    { value: 'Transferencia', label: 'Transferencia Bancaria' },
    { value: 'Otro', label: 'Otro' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar Pago</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          label="Monto"
          type="number"
          fullWidth
          margin="normal"
          value={amount || ''}
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={loading}
          inputProps={{ 
            min: 0, 
            max: maxAmount,
            step: 0.01 
          }}
        />
        
        <TextField
          select
          label="Método de pago"
          fullWidth
          margin="normal"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          disabled={loading}
        >
          {paymentMethods.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="textSecondary">
            Monto máximo:
          </Typography>
          <Typography variant="subtitle2">
            ${maxAmount.toLocaleString()}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={loading || amount <= 0 || amount > maxAmount}
        >
          {loading ? 'Procesando...' : 'Registrar Pago'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
