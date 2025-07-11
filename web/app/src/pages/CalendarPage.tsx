import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  ToggleButton, 
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
  Paper,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import { 
  Calendar as BigCalendar, 
  dateFnsLocalizer,
  Event as CalendarEvent,
  View,
  ToolbarProps,
  DateLocalizer,
  NavigateAction,
  ViewProps,
  EventProps,
  SlotInfo
} from 'react-big-calendar';
import { 
  format, 
  parse, 
  startOfWeek, 
  getDay, 
  addDays, 
  addWeeks, 
  addMonths, 
  isToday, 
  isSameDay, 
  isSameMonth, 
  isSameYear, 
  isSameWeek, 
  add, 
  subDays, 
  subWeeks, 
  subMonths 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft as ChevronLeftIcon, 
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  ViewAgenda as ViewAgendaIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { colReservations } from '../lib/paths';
import { reservationStatuses } from '../lib/reservations';

// Configuración de localización
const locales = {
  'es': es,
} as const;

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Lunes como primer día de la semana
  getDay,
  locales,
});

// Definir tipos personalizados
interface ReservationEvent extends CalendarEvent {
  id?: string;
  resource: {
    id: string;
    clientName: string;
    rooms: string[];
    status: string;
    total: number;
    balance: number;
    notes: string;
  };
  status: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resourceId?: string | number;
  tooltip?: string;
}

// Extender la interfaz de ToolbarProps para incluir las propiedades personalizadas
interface CustomToolbarProps extends ToolbarProps<ReservationEvent> {
  onNavigate: (action: NavigateAction, newDate?: Date) => void;
  onView: (view: View) => void;
  view: View;
  date: Date;
}

// Estilos personalizados para los eventos
const eventStyleGetter = (event: any) => {
  // Estilos base
  const baseStyle = {
    borderRadius: '4px',
    display: 'block',
    padding: '2px 5px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    border: '1px solid',
    opacity: 1,
    color: '#fff',
  };

  // Estilos por estado de reserva
  const statusStyles: Record<string, any> = {
    unconfirmed: {
      backgroundColor: '#ff9800',
      borderColor: '#f57c00',
    },
    confirmed: {
      backgroundColor: '#2196f3',
      borderColor: '#1976d2',
    },
    paid: {
      backgroundColor: '#4caf50',
      borderColor: '#388e3c',
    },
    cancelled: {
      backgroundColor: '#f44336',
      borderColor: '#d32f2f',
      opacity: 0.7,
    },
  };

  // Estilos por estado de ocupación
  const occupancyStyles: Record<string, any> = {
    'pre-arrival': {
      background: 'linear-gradient(45deg, #2196f3 30%, #4caf50 90%)',
      borderColor: '#1976d2',
    },
    'check-in': {
      background: 'linear-gradient(45deg, #4caf50 30%, #2e7d32 90%)',
      borderColor: '#388e3c',
    },
    'check-out': {
      background: 'linear-gradient(45deg, #9e9e9e 30%, #616161 90%)',
      borderColor: '#757575',
      opacity: 0.8,
    },
  };

  // Aplicar estilos según el estado de la reserva
  const statusStyle = statusStyles[event.status] || statusStyles.unconfirmed;
  
  // Aplicar estilos según el estado de ocupación si existe
  const occupancyStyle = event.resource?.occupancy ? 
    (occupancyStyles[event.resource.occupancy] || {}) : {};

  // Combinar estilos
  const finalStyle = {
    ...baseStyle,
    ...statusStyle,
    ...occupancyStyle,
  };

  return {
    style: finalStyle,
    className: `rbc-event-${event.status} ${event.resource?.occupancy ? `rbc-occupancy-${event.resource.occupancy}` : ''}`,
  };
};

// Componente personalizado para la barra de herramientas del calendario
const CustomToolbar: React.FC<CustomToolbarProps> = (props) => {
  const { date, view, onNavigate, onView } = props;
  const navigate = useNavigate();
  const { hotel } = useParams<{ hotel: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleToday = () => {
    onNavigate('TODAY');
  };

  const handleNext = () => {
    onNavigate('NEXT');
  };

  const handlePrevious = () => {
    onNavigate('PREV');
  };

  const handleViewChange = (event: React.MouseEvent<HTMLElement>, newView: View | null) => {
    if (newView) {
      onView(newView);
    }
  };

  const formatMonth = (date: Date) => {
    return format(date, 'MMMM yyyy', { locale: es });
  };

  const formatWeekRange = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    
    if (isSameDay(start, end)) {
      return format(start, 'd MMMM yyyy', { locale: es });
    }
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${format(start, 'MMMM yyyy', { locale: es })}`;
    }
    
    if (start.getFullYear() === end.getFullYear()) {
      return `${start.getDate()} ${format(start, 'MMM', { locale: es })} - ${end.getDate()} ${format(end, 'MMMM yyyy', { locale: es })}`;
    }
    
    return `${format(start, 'd MMM yyyy', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
  };

  const formatDayHeader = (date: Date) => {
    return (
      <div className="rbc-header">
        <div className="rbc-header-date">
          <div>{format(date, 'EEEE', { locale: es })}</div>
          <div className={isToday(date) ? 'rbc-now' : ''}>
            {format(date, 'd', { locale: es })}
          </div>
        </div>
      </div>
    );
  };

  const title = view === 'month' 
    ? formatMonth(date) 
    : view === 'week' 
      ? formatWeekRange(date)
      : format(date, 'PPPP', { locale: es });

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      mb: 2,
      gap: 2
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrevious} size="small">
            <ChevronLeftIcon />
          </IconButton>
          
          <IconButton onClick={handleToday} size="small">
            <TodayIcon />
          </IconButton>
          
          <IconButton onClick={handleNext} size="small">
            <ChevronRightIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
            {title}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(e, newView) => newView && handleViewChange(e, newView)}
            aria-label="calendar view"
            size="small"
            sx={{ mt: 1, mb: 1 }}
          >
            <ToggleButton value="day" aria-label="day view">
              <Tooltip title="Vista día">
                <ViewDayIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="week" aria-label="week view">
              <Tooltip title="Vista semana">
                <ViewWeekIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="month" aria-label="month view">
              <Tooltip title="Vista mes">
                <ViewAgendaIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          {!isMobile && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={Link}
              to={`/${hotel}/reservations/new`}
              size="small"
            >
              Nueva Reserva
            </Button>
          )}
        </Box>
      </Box>
      
      {isMobile && (
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          to={`/${hotel}/reservations/new`}
          size="small"
        >
          Nueva Reserva
        </Button>
      )}
    </Box>
  );
};

// Componente personalizado para los eventos
const EventComponent: React.FC<{ event: ReservationEvent }> = ({ event }) => {
  const navigate = useNavigate();
  const { hotel } = useParams<{ hotel: string }>();
  const theme = useTheme();
  
  const handleClick = () => {
    navigate(`/${hotel}/reservations/edit/${event.resource.id}`);
  };

  return (
    <div 
      onClick={handleClick}
      style={{
        height: '100%',
        padding: '2px 5px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontWeight: 'bold' }}>{event.title}</div>
      <div style={{ fontSize: '0.8em' }}>{event.resource.clientName}</div>
      <div style={{ fontSize: '0.8em' }}>
        {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
      </div>
    </div>
  );
};

// Componente principal del calendario
export default function CalendarPage() {
  const { hotel } = useParams<{ hotel: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ReservationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState<Date>(new Date());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!hotel) return;

    setLoading(true);
    const startOfMonth = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
    const endOfMonth = addDays(startOfWeek(addMonths(date, 1), { weekStartsOn: 1 }), 6);

    const q = query(
      collection(db, `hotels/${hotel}/reservations`),
      where('checkIn', '>=', Timestamp.fromDate(startOfMonth)),
      where('checkIn', '<=', Timestamp.fromDate(endOfMonth)),
      orderBy('checkIn', 'asc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reservations: ReservationEvent[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.checkIn && data.checkOut) {
          reservations.push({
            id: doc.id,
            start: data.checkIn.toDate(),
            end: data.checkOut.toDate(),
            title: `Reserva #${data.reservationNumber || 'N/A'} - ${data.clientName || 'Sin nombre'}`,
            resource: {
              id: doc.id,
              clientName: data.clientName || 'Sin nombre',
              rooms: data.rooms || [],
              status: data.status || 'pending',
              total: data.total || 0,
              balance: data.balance || 0,
              notes: data.notes || ''
            },
            status: data.status || 'pending'
          });
        }
      });

      setEvents(reservations);
      setLoading(false);
    }, (error) => {
      console.error('Error al cargar reservas:', error);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [hotel, date]);

  const handleNavigate = (action: NavigateAction, newDate?: Date) => {
    if (newDate) {
      setDate(newDate);
    } else {
      // Manejar acciones como 'TODAY', 'NEXT', 'PREV'
      const today = new Date();
      let newDateToSet = date;
      
      switch (action) {
        case 'TODAY':
          newDateToSet = today;
          break;
        case 'NEXT':
          if (view === 'month') newDateToSet = addMonths(date, 1);
          else if (view === 'week') newDateToSet = addWeeks(date, 1);
          else newDateToSet = addDays(date, 1);
          break;
        case 'PREV':
          if (view === 'month') newDateToSet = subMonths(date, 1);
          else if (view === 'week') newDateToSet = subWeeks(date, 1);
          else newDateToSet = subDays(date, 1);
          break;
      }
      
      setDate(newDateToSet);
    }
  };

  const handleView = (newView: View) => {
    setView(newView);
  };

  const handleSelectEvent = (event: ReservationEvent) => {
    // La navegación se maneja en el componente EventComponent
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (hotel) {
      // Navegar a nueva reserva con las fechas seleccionadas
      const startDate = format(slotInfo.start, 'yyyy-MM-dd');
      const endDate = format(slotInfo.end, 'yyyy-MM-dd');
      navigate(`/${hotel}/reservations/new?startDate=${startDate}&endDate=${endDate}`);
    }
  };

  // Estilos personalizados para las celdas del calendario
  const dayPropGetter = (date: Date) => {
    const today = new Date();
    
    // Resaltar el día actual
    if (isToday(date)) {
      return {
        style: {
          backgroundColor: 'rgba(25, 118, 210, 0.04)',
          borderTop: '2px solid #1976d2',
        },
      };
    }
    
    // Resaltar fines de semana
    if (date.getDay() === 0 || date.getDay() === 6) {
      return {
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
        },
      };
    }
    
    return {};
  };

  // Estilos personalizados para el encabezado del día
  const dayHeaderComponent = (props: any) => {
    const { date, localizer } = props;
    const isCurrentDay = isToday(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    return (
      <div 
        style={{
          padding: '8px',
          textAlign: 'center',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: isCurrentDay ? '#e3f2fd' : isWeekend ? '#f5f5f5' : 'white',
          fontWeight: isCurrentDay ? 'bold' : 'normal',
          color: isCurrentDay ? '#1976d2' : isWeekend ? '#757575' : 'inherit',
        }}
      >
        <div>{format(date, 'EEEE', { locale: es })}</div>
        <div style={{ 
          display: 'inline-block',
          width: '24px',
          height: '24px',
          lineHeight: '24px',
          borderRadius: '50%',
          backgroundColor: isCurrentDay ? '#1976d2' : 'transparent',
          color: isCurrentDay ? 'white' : 'inherit',
        }}>
          {date.getDate()}
        </div>
      </div>
    );
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 3, height: 'calc(100vh - 64px)' }}>
      <Paper sx={{ p: isMobile ? 1 : 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Typography>Cargando calendario...</Typography>
          </Box>
        ) : (
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor={(event: ReservationEvent) => new Date(event.start)}
            endAccessor={(event: ReservationEvent) => new Date(event.end)}
            style={{ height: '100%' }}
            defaultView="week"
            view={view}
            onView={handleView}
            date={date}
            onNavigate={handleNavigate}
            selectable
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            components={{
              toolbar: CustomToolbar as React.ComponentType<ToolbarProps<ReservationEvent, object>>,
              event: EventComponent as React.ComponentType<EventProps<ReservationEvent>>,
            }}
            eventPropGetter={eventStyleGetter}
            dayPropGetter={dayPropGetter}
            messages={{
              next: 'Siguiente',
              previous: 'Anterior',
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              agenda: 'Agenda',
              date: 'Fecha',
              time: 'Hora',
              event: 'Evento',
              noEventsInRange: 'No hay reservas en este rango de fechas.',
            }}
            min={new Date(0, 0, 0, 7, 0, 0)} // 7:00 AM
            max={new Date(0, 0, 0, 23, 0, 0)} // 11:00 PM
            step={30} // Intervalo de 30 minutos
            timeslots={2} // 2 bloques por hora (cada 30 minutos)
            defaultDate={new Date()}
          />
        )}
      </Paper>
    </Box>
  );
}
