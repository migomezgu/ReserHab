import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '../contexts/AuthContext';

export default function HotelSelector() {
  const { currentHotel, memberships, setCurrentHotel } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Mostrar el selector si hay más de un hotel y no hay hotel seleccionado
  useEffect(() => {
    if (memberships.length > 1 && !currentHotel) {
      setIsOpen(true);
    }
  }, [memberships, currentHotel]);

  const handleSelectHotel = (hotel: typeof memberships[0]) => {
    setCurrentHotel(hotel);
    setIsOpen(false);
  };

  if (memberships.length <= 1) return null;

  return (
    <Transition.Root show={isOpen} as={import('react').Fragment}>
      <Dialog as="div" className="relative z-10" onClose={() => {}}>
        <Transition.Child
          as={import('react').Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={import('react').Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H12v-1.5h3.75l1.5-1.5H12v-1.5h3.75l1.5-1.5z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      Seleccionar hotel
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tienes acceso a varios hoteles. Por favor, selecciona con cuál deseas trabajar.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 space-y-3">
                  {memberships.map((hotel) => (
                    <button
                      key={hotel.hotelId}
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      onClick={() => handleSelectHotel(hotel)}
                    >
                      {hotel.name || hotel.hotelId} ({hotel.role})
                    </button>
                  ))}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
