import { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Button, Dialog, DialogContent, TextField, DialogTitle, Alert, Snackbar, Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { colRooms } from '../lib/paths';

interface Room {
  id: string;
  number: string;
  type: 'single' | 'double' | 'suite' | 'family';
  status: 'available' | 'occupied' | 'maintenance';
  price: number;
  description?: string;
}

export default function RoomsPage() {
  const { hotel } = useParams<{ hotel: string }>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Room, 'id'>>({ 
    number: '', 
    type: 'double', 
    status: 'available',
    price: 0,
    description: ''
  });
  const [editId, setEditId] = useState<string | null>(null);

  // Load rooms
  useEffect(() => {
    if (!hotel) return;
    
    setLoading(true);
    const q = query(collection(db, colRooms(hotel)), orderBy('number'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRooms(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as Room));
        setLoading(false);
      },
      (err) => {
        setError('Error al cargar las habitaciones');
        setLoading(false);
        console.error(err);
      }
    );

    return () => unsubscribe();
  }, [hotel]);

  const handleOpen = () => {
    setForm({ number: '', type: 'double', status: 'available', price: 0, description: '' });
    setEditId(null);
    setOpen(true);
  };

  const handleEdit = (room: Room) => {
    setForm(room);
    setEditId(room.id);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel) return;
    
    try {
      if (editId) {
        await updateDoc(doc(db, colRooms(hotel), editId), form);
      } else {
        // Check if room number already exists
        const exists = rooms.some(r => r.number === form.number && r.id !== editId);
        if (exists) {
          setError('Ya existe una habitación con este número');
          return;
        }
        await addDoc(collection(db, colRooms(hotel)), form);
      }
      setOpen(false);
    } catch (err) {
      setError('Error al guardar la habitación');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!hotel || !window.confirm('¿Estás seguro de eliminar esta habitación?')) return;
    
    try {
      await deleteDoc(doc(db, colRooms(hotel), id));
    } catch (err) {
      setError('Error al eliminar la habitación');
      console.error(err);
    }
  };

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'Número', flex: 1 },
    { 
      field: 'type', 
      headerName: 'Tipo', 
      flex: 1,
      valueGetter: (params) => {
        const types: Record<string, string> = {
          'single': 'Individual',
          'double': 'Doble',
          'suite': 'Suite',
          'family': 'Familiar'
        };
        return types[params.value] || params.value;
      }
    },
    { 
      field: 'status', 
      headerName: 'Estado', 
      flex: 1,
      renderCell: (params) => {
        const statuses: Record<string, {label: string, color: string}> = {
          'available': { label: 'Disponible', color: 'success.main' },
          'occupied': { label: 'Ocupada', color: 'error.main' },
          'maintenance': { label: 'Mantenimiento', color: 'warning.main' }
        };
        const status = statuses[params.value] || { label: params.value, color: 'text.primary' };
        return <span style={{ color: status.color }}>{status.label}</span>;
      }
    },
    { 
      field: 'price', 
      headerName: 'Precio', 
      flex: 1,
      valueFormatter: (params) => `$${params.value.toLocaleString()}`
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      sortable: false,
      width: 150,
      renderCell: (params: GridRowParams) => (
        <div className="flex gap-2">
          <Button 
            size="small" 
            variant="outlined" 
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(params.row as Room);
            }}
          >
            Editar
          </Button>
          <Button 
            size="small" 
            color="error" 
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(params.id as string);
            }}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Gestión de Habitaciones</Typography>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Nueva Habitación
        </Button>
      </Box>

      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rooms}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          onRowClick={(params) => handleEdit(params.row as Room)}
        />
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editId ? 'Editar Habitación' : 'Nueva Habitación'}</DialogTitle>
          <DialogContent className="flex flex-col gap-4 py-4">
            <TextField
              label="Número de habitación"
              value={form.number}
              onChange={(e) => setForm({...form, number: e.target.value})}
              required
              fullWidth
              margin="normal"
            />
            
            <TextField
              select
              label="Tipo de habitación"
              value={form.type}
              onChange={(e) => setForm({...form, type: e.target.value as any})}
              required
              fullWidth
              margin="normal"
              SelectProps={{ native: true }}
            >
              <option value="single">Individual</option>
              <option value="double">Doble</option>
              <option value="suite">Suite</option>
              <option value="family">Familiar</option>
            </TextField>

            <TextField
              select
              label="Estado"
              value={form.status}
              onChange={(e) => setForm({...form, status: e.target.value as any})}
              required
              fullWidth
              margin="normal"
              SelectProps={{ native: true }}
            >
              <option value="available">Disponible</option>
              <option value="occupied">Ocupada</option>
              <option value="maintenance">En mantenimiento</option>
            </TextField>

            <TextField
              label="Precio por noche"
              type="number"
              value={form.price}
              onChange={(e) => setForm({...form, price: Number(e.target.value)})}
              required
              fullWidth
              margin="normal"
              inputProps={{ min: 0, step: 0.01 }}
            />

            <TextField
              label="Descripción"
              value={form.description || ''}
              onChange={(e) => setForm({...form, description: e.target.value})}
              fullWidth
              margin="normal"
              multiline
              rows={3}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="contained" color="primary">
                {editId ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </form>
      </Dialog>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </div>
  );
}
