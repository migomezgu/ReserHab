import { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  TextField, 
  MenuItem, 
  Button, 
  Checkbox, 
  FormControl, 
  FormControlLabel, 
  FormGroup,
  InputLabel,
  Select,
  SelectChangeEvent,
  Grid,
  Typography,
  Box
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { addDoc, updateDoc, doc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams } from 'react-router-dom';
import { colRooms, colClients, colReservations } from '../lib/paths';
import { isRoomFree, reservationStatuses, reservationChannels } from '../lib/reservations';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Room {
  id: string;
  number: string;
  type: string;
  price: number;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface ReservationFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  edit?: any;
}

export default function ReservationForm({ open, setOpen, edit }: ReservationFormProps) {
  const { hotel } = useParams<{ hotel: string }>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    clientId: '',
    rooms: [] as string[],
    channel: 'hotel',
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    status: 'unconfirmed',
    total: 0,
    balance: 0,
    notes: '',
    guests: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  useEffect(() => {
    if (edit) {
      setForm({
        ...edit,
        startDate: edit.startDate?.toDate(),
        endDate: edit.endDate?.toDate(),
        createdAt: edit.createdAt?.toDate(),
        updatedAt: edit.updatedAt?.toDate(),
      });
    } else {
      setForm({
        clientId: '',
        rooms: [],
        channel: 'hotel',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'unconfirmed',
        total: 0,
        balance: 0,
        notes: '',
        guests: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }, [edit, open]);

  useEffect(() => {
    async function loadData() {
      if (!hotel) return;
      
      try {
        setLoading(true);
        
        // Load rooms
        const roomsSnapshot = await getDocs(collection(db, colRooms(hotel)));
        const roomsData = roomsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Room[];
        setRooms(roomsData);
        
        // Load clients
        const clientsSnapshot = await getDocs(collection(db, colClients(hotel)));
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
        setClients(clientsData);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (open) {
      loadData();
    }
  }, [hotel, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDateChange = (name: string, date: Date | null) => {
    if (!date) return;
    
    setForm(prev => ({
      ...prev,
      [name]: date
    }));
    
    // Clear date errors when dates are changed
    if (errors.startDate || errors.endDate) {
      setErrors(prev => ({
        ...prev,
        startDate: '',
        endDate: ''
      }));
    }
  };

  const toggleRoom = (roomId: string) => {
    setForm(prev => {
      const newRooms = prev.rooms.includes(roomId)
        ? prev.rooms.filter(id => id !== roomId)
        : [...prev.rooms, roomId];
      
      // Calculate total based on selected rooms
      const selectedRooms = rooms.filter(room => newRooms.includes(room.id));
      const total = selectedRooms.reduce((sum, room) => sum + (room.price || 0), 0);
      
      return {
        ...prev,
        rooms: newRooms,
        total,
        balance: total - (prev.balance || 0)
      };
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.clientId) {
      newErrors.clientId = 'Seleccione un cliente';
    }
    
    if (form.rooms.length === 0) {
      newErrors.rooms = 'Seleccione al menos una habitación';
    }
    
    if (!form.startDate) {
      newErrors.startDate = 'Seleccione fecha de entrada';
    }
    
    if (!form.endDate) {
      newErrors.endDate = 'Seleccione fecha de salida';
    } else if (form.startDate && form.endDate <= form.startDate) {
      newErrors.endDate = 'La fecha de salida debe ser posterior a la de entrada';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !hotel) return;
    
    try {
      setLoading(true);
      
      // Check room availability
      for (const roomId of form.rooms) {
        const isFree = await isRoomFree(
          hotel,
          roomId,
          Timestamp.fromDate(new Date(form.startDate)),
          Timestamp.fromDate(new Date(form.endDate)),
          edit?.id
        );
        
        if (!isFree) {
          const room = rooms.find(r => r.id === roomId);
          setErrors(prev => ({
            ...prev,
            rooms: `La habitación ${room?.number} no está disponible en las fechas seleccionadas`
          }));
          return;
        }
      }
      
      const reservationData = {
        ...form,
        startDate: Timestamp.fromDate(new Date(form.startDate)),
        endDate: Timestamp.fromDate(new Date(form.endDate)),
        updatedAt: Timestamp.fromDate(new Date()),
        createdAt: edit?.createdAt ? Timestamp.fromDate(new Date(edit.createdAt)) : Timestamp.fromDate(new Date()),
      };
      
      if (edit) {
        await updateDoc(doc(db, colReservations(hotel), edit.id), reservationData);
      } else {
        await addDoc(collection(db, colReservations(hotel)), reservationData);
      }
      
      setOpen(false);
      
    } catch (error) {
      console.error('Error saving reservation:', error);
      setErrors(prev => ({
        ...prev,
        form: 'Error al guardar la reserva. Por favor, intente nuevamente.'
      }));
    } finally {
      setLoading(false);
    }
  };

  const getRoomTypeCounts = () => {
    const counts: Record<string, number> = {};
    
    form.rooms.forEach(roomId => {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        counts[room.type] = (counts[room.type] || 0) + 1;
      }
    });
    
    return Object.entries(counts).map(([type, count]) => (
      <div key={type}>
        {count} {type}{count > 1 ? 's' : ''}
      </div>
    ));
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => !loading && setOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogContent>
        <Typography variant="h6" gutterBottom>
          {edit ? 'Editar Reserva' : 'Nueva Reserva'}
        </Typography>
        
        {errors.form && (
          <Typography color="error" gutterBottom>
            {errors.form}
          </Typography>
        )}
        
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" error={!!errors.clientId}>
                <InputLabel id="client-label">Cliente *</InputLabel>
                <Select
                  labelId="client-label"
                  name="clientId"
                  value={form.clientId}
                  onChange={handleChange}
                  label="Cliente *"
                  disabled={loading}
                >
                  {clients.map(client => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name} {client.email ? `(${client.email})` : ''}
                    </MenuItem>
                  ))}
                </Select>
                {errors.clientId && (
                  <Typography variant="caption" color="error">
                    {errors.clientId}
                  </Typography>
                )}
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <DatePicker
                  label="Fecha de Entrada"
                  value={form.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  format="dd/MM/yyyy"
                  disabled={loading}
                  slotProps={{
                    textField: {
                      error: !!errors.startDate,
                      helperText: errors.startDate || ' ',
                      fullWidth: true
                    }
                  }}
                />
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <DatePicker
                  label="Fecha de Salida"
                  value={form.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  format="dd/MM/yyyy"
                  disabled={loading}
                  minDate={form.startDate}
                  slotProps={{
                    textField: {
                      error: !!errors.endDate,
                      helperText: errors.endDate || ' ',
                      fullWidth: true
                    }
                  }}
                />
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="status-label">Estado</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  label="Estado"
                  disabled={loading}
                >
                  {reservationStatuses.map(status => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="channel-label">Canal de Reserva</InputLabel>
                <Select
                  labelId="channel-label"
                  name="channel"
                  value={form.channel}
                  onChange={handleChange}
                  label="Canal de Reserva"
                  disabled={loading}
                >
                  {reservationChannels.map(channel => (
                    <MenuItem key={channel.value} value={channel.value}>
                      {channel.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                margin="normal"
                name="guests"
                label="Número de Huéspedes"
                type="number"
                value={form.guests}
                onChange={handleChange}
                disabled={loading}
                inputProps={{ min: 1 }}
              />
              
              <TextField
                fullWidth
                margin="normal"
                name="total"
                label="Total"
                type="number"
                value={form.total}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: '$ ',
                }}
              />
              
              <TextField
                fullWidth
                margin="normal"
                name="balance"
                label="Saldo Pendiente"
                type="number"
                value={form.balance}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: '$ ',
                }}
              />
              
              <TextField
                fullWidth
                margin="normal"
                name="notes"
                label="Notas"
                multiline
                rows={3}
                value={form.notes}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Habitaciones Seleccionadas
              </Typography>
              
              {errors.rooms && (
                <Typography color="error" gutterBottom>
                  {errors.rooms}
                </Typography>
              )}
              
              <Box sx={{ 
                border: '1px solid rgba(0, 0, 0, 0.23)',
                borderRadius: 1,
                p: 2,
                mb: 2,
                maxHeight: 300,
                overflow: 'auto'
              }}>
                {form.rooms.length === 0 ? (
                  <Typography color="textSecondary" align="center" sx={{ py: 2 }}>
                    No hay habitaciones seleccionadas
                  </Typography>
                ) : (
                  <FormGroup>
                    {rooms.map(room => (
                      <FormControlLabel
                        key={room.id}
                        control={
                          <Checkbox
                            checked={form.rooms.includes(room.id)}
                            onChange={() => toggleRoom(room.id)}
                            disabled={loading}
                          />
                        }
                        label={`${room.number} - ${room.type} ($${room.price})`}
                      />
                    ))}
                  </FormGroup>
                )}
              </Box>
              
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Resumen de la Reserva
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Noches:</Typography>
                  <Typography>
                    {form.startDate && form.endDate 
                      ? Math.ceil((form.endDate.getTime() - form.startDate.getTime()) / (1000 * 60 * 60 * 24))
                      : 0}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Habitaciones:</Typography>
                  <Box>
                    {getRoomTypeCounts()}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: '1px solid #e0e0e0' }}>
                  <Typography variant="subtitle1">Total:</Typography>
                  <Typography variant="subtitle1">
                    ${form.total.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button 
          onClick={() => setOpen(false)}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading || form.rooms.length === 0}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </Box>
    </Dialog>
  );
}
