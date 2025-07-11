import { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Button, Dialog, DialogContent, TextField, DialogTitle, Alert, Snackbar, Box, Typography, IconButton } from '@mui/material';
import { useParams } from 'react-router-dom';
import { colClients } from '../lib/paths';
import { Edit as EditIcon, Delete as DeleteIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentId: string;
  documentType: 'dni' | 'passport' | 'other';
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ClientsPage() {
  const { hotel } = useParams<{ hotel: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>({ 
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentId: '',
    documentType: 'dni',
    address: '',
    notes: ''
  });
  const [editId, setEditId] = useState<string | null>(null);

  // Load clients
  useEffect(() => {
    if (!hotel) return;
    
    setLoading(true);
    const q = query(collection(db, colClients(hotel)), orderBy('lastName'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setClients(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to Date objects
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        }) as Client));
        setLoading(false);
      },
      (err) => {
        setError('Error al cargar los clientes');
        setLoading(false);
        console.error(err);
      }
    );

    return () => unsubscribe();
  }, [hotel]);

  const handleOpen = () => {
    setForm({ 
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      documentId: '',
      documentType: 'dni',
      address: '',
      notes: ''
    });
    setEditId(null);
    setOpen(true);
  };

  const handleEdit = (client: Client) => {
    const { id, createdAt, updatedAt, ...clientData } = client;
    setForm(clientData);
    setEditId(id);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel) return;
    
    try {
      const now = new Date();
      const clientData = {
        ...form,
        updatedAt: now,
        ...(!editId && { createdAt: now }) // Only set createdAt for new clients
      };

      if (editId) {
        await updateDoc(doc(db, colClients(hotel), editId), clientData);
      } else {
        // Check if document ID already exists
        const exists = clients.some(c => c.documentId === form.documentId && c.documentType === form.documentType && c.id !== editId);
        if (exists) {
          setError('Ya existe un cliente con este documento');
          return;
        }
        await addDoc(collection(db, colClients(hotel)), clientData);
      }
      setOpen(false);
    } catch (err) {
      setError('Error al guardar el cliente');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!hotel || !window.confirm('¿Estás seguro de eliminar este cliente?')) return;
    
    try {
      await deleteDoc(doc(db, colClients(hotel), id));
    } catch (err) {
      setError('Error al eliminar el cliente');
      console.error(err);
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'fullName', 
      headerName: 'Nombre', 
      flex: 1,
      valueGetter: (params) => `${params.row.firstName} ${params.row.lastName}`.trim()
    },
    { 
      field: 'document', 
      headerName: 'Documento', 
      flex: 1,
      valueGetter: (params) => {
        const types = { 'dni': 'DNI', 'passport': 'Pasaporte', 'other': 'Otro' };
        return `${types[params.row.documentType as keyof typeof types] || ''} ${params.row.documentId}`.trim();
      }
    },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'phone', headerName: 'Teléfono', flex: 1 },
    { 
      field: 'createdAt', 
      headerName: 'Fecha de registro', 
      flex: 1,
      valueFormatter: (params) => params.value?.toLocaleDateString()
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      sortable: false,
      width: 120,
      renderCell: (params: GridRowParams) => (
        <div className="flex gap-1">
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(params.row as Client);
            }}
            color="primary"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(params.id as string);
            }}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Gestión de Clientes</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpen}
          startIcon={<PersonAddIcon />}
        >
          Nuevo Cliente
        </Button>
      </Box>

      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={clients}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          onRowClick={(params) => handleEdit(params.row as Client)}
        />
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          <DialogContent className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <TextField
              label="Nombre"
              value={form.firstName}
              onChange={(e) => setForm({...form, firstName: e.target.value})}
              required
              fullWidth
              margin="normal"
              className="col-span-1"
            />
            
            <TextField
              label="Apellidos"
              value={form.lastName}
              onChange={(e) => setForm({...form, lastName: e.target.value})}
              required
              fullWidth
              margin="normal"
              className="col-span-1"
            />

            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                select
                label="Tipo de documento"
                value={form.documentType}
                onChange={(e) => setForm({...form, documentType: e.target.value as any})}
                required
                fullWidth
                margin="normal"
                SelectProps={{ native: true }}
              >
                <option value="dni">DNI</option>
                <option value="passport">Pasaporte</option>
                <option value="other">Otro</option>
              </TextField>

              <TextField
                label="Número de documento"
                value={form.documentId}
                onChange={(e) => setForm({...form, documentId: e.target.value})}
                required
                fullWidth
                margin="normal"
              />
            </div>

            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              fullWidth
              margin="normal"
              className="col-span-1"
            />

            <TextField
              label="Teléfono"
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
              fullWidth
              margin="normal"
              className="col-span-1"
            />

            <TextField
              label="Dirección"
              value={form.address || ''}
              onChange={(e) => setForm({...form, address: e.target.value})}
              fullWidth
              margin="normal"
              className="col-span-2"
              multiline
              rows={2}
            />

            <TextField
              label="Notas"
              value={form.notes || ''}
              onChange={(e) => setForm({...form, notes: e.target.value})}
              fullWidth
              margin="normal"
              className="col-span-2"
              multiline
              rows={3}
            />

            <div className="col-span-2 flex justify-end gap-2 mt-4">
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
