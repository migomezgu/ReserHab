/* ReservationsPage.tsx */
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useConfirm } from 'material-ui-confirm';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type {
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
  GridCallbackDetails,
  GridRowId,
  GridValueFormatterParams,
  GridValueFormatterParams as GridValueFormatterParamsType,
} from '@mui/x-data-grid';
import {
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  collection,
  query,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Hotel as HotelIcon,
  AttachMoney as AttachMoneyIcon,
  MeetingRoom as MeetingRoomIcon,
} from '@mui/icons-material';

import PaymentDialog from '../components/PaymentDialog';
import DeliveriesDialog from '../components/DeliveriesDialog';

interface Reservation {
  id: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  roomNumber: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked-in' | 'checked-out';
  totalAmount: number;
  paidAmount: number;
  balance: number;
  roomIds: string[];
  missing?: boolean;
}

const ReservationsPage: React.FC = () => {
  /* ──────────────────────────── estados ──────────────────────────── */
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<GridRowId[]>([]);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  const [deliveryDialog, setDeliveryDialog] = useState<{
    open: boolean;
    res: Reservation | null;
    mode: 'entrega' | 'recepcion';
  }>({ open: false, res: null, mode: 'entrega' });

  /* ──────────────────────────── hooks ─────────────────────────────── */
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { hotel } = useParams<{ hotel: string }>();

  /* ──────────────────────────── handlers UI ───────────────────────── */
  const handleSelectionChange = (
    selectionModel: GridRowSelectionModel,
    _details: GridCallbackDetails,
  ) => {
    setSelected(selectionModel as string[]);
  };

  const handleOpenDeliveryDialog = (
    reservation: Reservation,
    mode: 'entrega' | 'recepcion',
  ) => {
    setDeliveryDialog({ open: true, res: reservation, mode });
  };

  const handleCloseDeliveryDialog = () => {
    setDeliveryDialog(prev => ({ ...prev, open: false }));
  };

  /* ──────────────────────────── Firestore – escuchar reservas ─────── */
  useEffect(() => {
    if (!hotel) return;
    setLoading(true);

    const q = query(collection(db, 'hotels', hotel, 'reservations'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Reservation[];
        setReservations(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        enqueueSnackbar('Error al cargar las reservas', { variant: 'error' });
        setLoading(false);
      },
    );

    return unsub;
  }, [hotel, enqueueSnackbar]);

  /* ──────────────────────────── acciones principales ──────────────── */
  const handleDelete = async (id: GridRowId) => {
    if (!hotel) return;
    try {
      await confirm({
        title: 'Confirmar eliminación',
        description: '¿Estás seguro de eliminar esta reserva?',
        confirmationText: 'Eliminar',
        confirmationButtonProps: { color: 'error' } as any,
      });
      await deleteDoc(doc(db, 'hotels', hotel, 'reservations', String(id)));
      enqueueSnackbar('Reserva eliminada', { variant: 'success' });
    } catch (err) {
      if ((err as Error).message !== 'cancelled') {
        enqueueSnackbar('Error al eliminar', { variant: 'error' });
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (!hotel || selected.length === 0) return;
    try {
      await confirm({
        title: `¿Eliminar ${selected.length} reserva(s)?`,
        confirmationText: 'Eliminar',
        confirmationButtonProps: { color: 'error' } as any,
      });
      const batch = writeBatch(db);
      selected.forEach((id) =>
        batch.delete(doc(db, 'hotels', hotel, 'reservations', String(id)))
      );
      await batch.commit();
      enqueueSnackbar('Reservas eliminadas', { variant: 'success' });
      setSelected([]);
    } catch (err) {
      const error = err as Error;
      if (error.message !== 'cancelled') {
        enqueueSnackbar('Error al eliminar', { variant: 'error' });
      }
    }
  };

  const handleAddPayment = async (amount: number, method: string) => {
    if (!selectedReservation || !hotel) return;
    
    try {
      const paymentRef = collection(db, `hotels/${hotel}/reservations/${selectedReservation.id}/payments`);
      await addDoc(paymentRef, {
        amount,
        method,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      
      // Update reservation balance
      const newBalance = selectedReservation.balance - amount;
      await updateDoc(doc(db, `hotels/${hotel}/reservations/${selectedReservation.id}`), {
        balance: newBalance,
        status: newBalance <= 0 ? 'paid' : 'pending',
        updatedAt: serverTimestamp(),
      });
      
      enqueueSnackbar('Pago registrado exitosamente', { variant: 'success' });
      setPaymentDialogOpen(false);
    } catch (error) {
      console.error('Error al registrar pago:', error);
      enqueueSnackbar('Error al registrar el pago', { variant: 'error' });
    }
  };
  
  const handleOpenPaymentDialog = (res: Reservation) => {
    setSelectedReservation(res);
    setPaymentDialogOpen(true);
  };

  const handlePaymentDialogClose = () => {
    setPaymentDialogOpen(false);
    setSelectedReservation(null);
  };

  /* ──────────────────────────── columnas DataGrid ─────────────────── */
  const columns: GridColDef[] = [
    {
      field: 'missing',
      headerName: 'Falt.',
      width: 70,
      renderCell: (params: GridRenderCellParams) => (params.value ? '🟥' : ''),
    },
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'guestName', headerName: 'Huésped', flex: 1, minWidth: 150 },
    {
      field: 'checkIn',
      headerName: 'Check-in',
      width: 120,
      valueFormatter: (params: GridValueFormatterParamsType) =>
        params.value ? new Date(params.value as string).toLocaleDateString() : '',
    },
    {
      field: 'checkOut',
      headerName: 'Check-out',
      width: 120,
      valueFormatter: (params: GridValueFormatterParamsType) =>
        params.value ? new Date(params.value as string).toLocaleDateString() : '',
    },
    { field: 'roomNumber', headerName: 'Habitación', width: 120 },
    {
      field: 'status',
      headerName: 'Estado',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: 'balance',
      headerName: 'Saldo',
      width: 120,
      valueFormatter: (params: GridValueFormatterParamsType) =>
        `$${((params.value as number) ?? 0).toLocaleString()}`,
      renderCell: (params: GridRenderCellParams) => {
        const value = params.value as number;
        return (
          <strong style={{ color: value > 0 ? '#f44336' : '#4caf50' }}>
            ${value?.toLocaleString() || 0}
          </strong>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 260,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/${hotel}/reservations/edit/${params.row.id}`)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>

          {/* Pago */}
          <IconButton
            size="small"
            color="success"
            disabled={!params.row.balance}
            onClick={() => handleOpenPaymentDialog(params.row)}
          >
            <AttachMoneyIcon fontSize="small" />
          </IconButton>

          {/* Entrega / Recepción */}
          {params.row.status === 'confirmed' && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleOpenDeliveryDialog(params.row, 'entrega')}
              startIcon={<HotelIcon fontSize="small" />}
              color="success"
            >
              Entrega
            </Button>
          )}
          {params.row.status === 'checked-in' && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleOpenDeliveryDialog(params.row, 'recepcion')}
              startIcon={<MeetingRoomIcon fontSize="small" />}
              color="secondary"
            >
              Recepción
            </Button>
          )}
        </Box>
      ),
    },
  ];

  /* ──────────────────────────── render ─────────────────────────────── */
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5">Reservas</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selected.length > 0 && (
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteSelected}
              startIcon={<DeleteIcon />}
              size={isMobile ? 'small' : 'medium'}
            >
              Eliminar ({selected.length})
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/${hotel}/reservations/new`)}
            startIcon={<AddIcon />}
            size={isMobile ? 'small' : 'medium'}
          >
            Nueva Reserva
          </Button>
        </Box>
      </Box>
      <DataGrid
        rows={reservations}
        columns={columns}
        loading={loading}
        checkboxSelection
        disableRowSelectionOnClick
        rowSelectionModel={selected}
        onRowSelectionModelChange={handleSelectionChange}
        slots={{ toolbar: GridToolbar }}
        slotProps={{ toolbar: { showQuickFilter: true } }}
        sx={{
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
            outline: 'none',
          },
        }}
        localeText={{
          toolbarDensity: 'Densidad',
          toolbarDensityLabel: 'Densidad',
          toolbarDensityCompact: 'Compacta',
          toolbarDensityStandard: 'Estándar',
          toolbarDensityComfortable: 'Cómoda',
          toolbarFilters: 'Filtros',
          toolbarFiltersLabel: 'Mostrar filtros',
          toolbarFiltersTooltipHide: 'Ocultar filtros',
          toolbarFiltersTooltipShow: 'Mostrar filtros',
          toolbarExport: 'Exportar',
          toolbarExportCSV: 'Descargar como CSV',
          toolbarExportPrint: 'Imprimir',
          toolbarColumns: 'Columnas',
          toolbarColumnsLabel: 'Mostrar columnas',
          columnsPanelTextFieldPlaceholder: 'Buscar columna',
          columnsPanelShowAllButton: 'Mostrar todo',
          columnsPanelHideAllButton: 'Ocultar todo',
          noRowsLabel: 'No hay registros',
          noResultsOverlayLabel: 'No se encontraron resultados',
          footerRowSelected: (count: number) =>
            count !== 1
              ? `${count.toLocaleString()} filas seleccionadas`
              : '1 fila seleccionada',
        } as any}
      />
      {/* Diálogos */}
      {paymentDialogOpen && selectedReservation && (
        <PaymentDialog
          open={paymentDialogOpen}
          onClose={handlePaymentDialogClose}
          maxAmount={selectedReservation.balance}
          onSubmit={handleAddPayment}
        />
      )}

      {deliveryDialog.open && deliveryDialog.res && (
        <DeliveriesDialog
          open={deliveryDialog.open}
          setOpen={(open) => !open && handleCloseDeliveryDialog()}
          res={deliveryDialog.res}
          mode={deliveryDialog.mode}
        />
      )}
    </Box>
  );
};

export default ReservationsPage;
