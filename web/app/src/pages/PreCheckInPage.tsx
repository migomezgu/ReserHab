import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  IconButton, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { doc, getDoc, collection, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  docType: string;
  docNum: string;
}

interface Reservation {
  id: string;
  startDate: Timestamp;
  endDate: Timestamp;
  rooms: string[];
  total: number;
  status: string;
  occupancy?: string;
}

const PreCheckInPage: React.FC = () => {
  const { hotel, resId } = useParams<{ hotel: string; resId: string }>();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [guests, setGuests] = useState<Guest[]>([
    { id: uuidv4(), name: '', email: '', phone: '', docType: 'CC', docNum: '' }
  ]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Load reservation data
  useEffect(() => {
    const loadReservation = async () => {
      if (!hotel || !resId) return;
      
      try {
        setLoading(true);
        const resDoc = await getDoc(doc(db, `hotels/${hotel}/reservations/${resId}`));
        
        if (!resDoc.exists()) {
          setError('Reserva no encontrada');
          return;
        }
        
        const resData = { id: resDoc.id, ...resDoc.data() } as Reservation;
        setReservation(resData);
        
        // If already checked in, redirect
        if (resData.occupancy === 'check-in' || resData.status === 'check-out') {
          navigate(`/${hotel}/reservations/${resId}`);
        }
      } catch (err) {
        console.error('Error loading reservation:', err);
        setError('Error al cargar la reserva');
      } finally {
        setLoading(false);
      }
    };
    
    loadReservation();
  }, [hotel, resId, navigate]);

  const handleGuestChange = (id: string, field: keyof Guest, value: string) => {
    setGuests(guests.map(guest => 
      guest.id === id ? { ...guest, [field]: value } : guest
    ));
  };

  const addGuest = () => {
    setGuests([...guests, { 
      id: uuidv4(), 
      name: '', 
      email: '', 
      phone: '', 
      docType: 'CC', 
      docNum: '' 
    }]);
  };

  const removeGuest = (id: string) => {
    if (guests.length > 1) {
      setGuests(guests.filter(guest => guest.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hotel || !resId || !reservation) return;
    
    // Basic validation
    const hasEmptyFields = guests.some(guest => 
      !guest.name.trim() || !guest.email.trim() || !guest.docNum.trim()
    );
    
    if (hasEmptyFields) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Save guests to subcollection
      const guestPromises = guests.map(guest => {
        const { id, ...guestData } = guest;
        return addDoc(collection(db, `hotels/${hotel}/reservations/${resId}/guests`), guestData);
      });
      
      await Promise.all(guestPromises);
      
      // Update reservation status
      await updateDoc(doc(db, `hotels/${hotel}/reservations/${resId}`), {
        occupancy: 'pre-arrival',
        updatedAt: Timestamp.now()
      });
      
      setSubmitted(true);
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error submitting pre-checkin:', err);
      setError('Error al procesar el pre-check-in. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3} textAlign="center">
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" color="primary" onClick={() => window.location.href = '/'} sx={{ mt: 2 }}>
          Volver al inicio
        </Button>
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box p={3} textAlign="center">
        <Alert severity="success" sx={{ mb: 2 }}>
          ¡Gracias! Hemos registrado tu pre-check-in correctamente.
        </Alert>
        <Typography variant="h6" gutterBottom>
          Número de reserva: {reservation?.id}
        </Typography>
        <Typography variant="body1" paragraph>
          Te esperamos el {reservation?.startDate?.toDate().toLocaleDateString()} a partir de las 15:00 hrs.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.href = '/'}
        >
          Volver al inicio
        </Button>
      </Box>
    );
  }

  if (!reservation) {
    return (
      <Box p={3} textAlign="center">
        <Alert severity="warning">No se encontró la reserva especificada.</Alert>
      </Box>
    );
  }

  return (
    <Box maxWidth="md" mx="auto" p={3}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Pre-Check-in - Reserva #{reservation.id}
        </Typography>
        
        <Box mb={4}>
          <Typography variant="subtitle1" gutterBottom>
            Detalles de la reserva:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography><strong>Llegada:</strong> {reservation.startDate?.toDate().toLocaleDateString()}</Typography>
              <Typography><strong>Salida:</strong> {reservation.endDate?.toDate().toLocaleDateString()}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography><strong>Habitaciones:</strong> {reservation.rooms?.join(', ')}</Typography>
              <Typography><strong>Total:</strong> ${reservation.total?.toLocaleString()}</Typography>
            </Grid>
          </Grid>
        </Box>

        <Typography variant="h6" gutterBottom>
          Información de los huéspedes
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Por favor completa la información de todos los huéspedes que se hospedarán.
        </Typography>

        <form onSubmit={handleSubmit}>
          {guests.map((guest, index) => (
            <Paper key={guest.id} sx={{ p: 2, mb: 3, position: 'relative' }} variant="outlined">
              <Typography variant="subtitle2" gutterBottom>
                Huésped {index + 1}
              </Typography>
              
              {guests.length > 1 && (
                <IconButton 
                  size="small" 
                  onClick={() => removeGuest(guest.id)}
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
              
              <Grid container spacing={2} component="div">
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nombre completo *"
                    value={guest.name}
                    onChange={(e) => handleGuestChange(guest.id, 'name', e.target.value)}
                    fullWidth
                    margin="normal"
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Correo electrónico *"
                    type="email"
                    value={guest.email}
                    onChange={(e) => handleGuestChange(guest.id, 'email', e.target.value)}
                    fullWidth
                    margin="normal"
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Teléfono"
                    value={guest.phone}
                    onChange={(e) => handleGuestChange(guest.id, 'phone', e.target.value)}
                    fullWidth
                    margin="normal"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth margin="normal" size="small">
                    <InputLabel>Tipo de documento</InputLabel>
                    <Select
                      value={guest.docType}
                      label="Tipo de documento"
                      onChange={(e) => handleGuestChange(guest.id, 'docType', e.target.value as string)}
                    >
                      <MenuItem value="CC">Cédula</MenuItem>
                      <MenuItem value="PASSPORT">Pasaporte</MenuItem>
                      <MenuItem value="CE">Cédula de extranjería</MenuItem>
                      <MenuItem value="OTHER">Otro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Número de documento *"
                    value={guest.docNum}
                    onChange={(e) => handleGuestChange(guest.id, 'docNum', e.target.value)}
                    fullWidth
                    margin="normal"
                    size="small"
                    required
                  />
                </Grid>
              </Grid>
            </Paper>
          ))}

          <Box display="flex" justifyContent="space-between" mt={2} mb={4}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addGuest}
              disabled={guests.length >= 10}
            >
              Añadir otro huésped
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? 'Enviando...' : 'Enviar pre-check-in'}
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            * Campos obligatorios
          </Typography>
        </form>
      </Paper>
    </Box>
  );
};

export default PreCheckInPage;
