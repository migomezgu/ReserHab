declare module 'notistack' {
  import { SnackbarOrigin, SnackbarProps } from '@mui/material';
  import { ReactNode } from 'react';

  export interface OptionsObject {
    variant?: 'default' | 'error' | 'success' | 'warning' | 'info';
    autoHideDuration?: number;
    anchorOrigin?: SnackbarOrigin;
    persist?: boolean;
    preventDuplicate?: boolean;
    [key: string]: any;
  }

  export interface ProviderContext {
    enqueueSnackbar: (
      message: ReactNode,
      options?: OptionsObject
    ) => string | number;
    closeSnackbar: (key?: string | number) => void;
  }

  export const useSnackbar: () => ProviderContext;
  
  export const SnackbarProvider: React.ComponentType<{
    children?: ReactNode;
    maxSnack?: number;
    preventDuplicate?: boolean;
    anchorOrigin?: SnackbarOrigin;
    classes?: Record<string, string>;
    hideIconVariant?: boolean;
    iconVariant?: {
      default?: ReactNode;
      error?: ReactNode;
      success?: ReactNode;
      warning?: ReactNode;
      info?: ReactNode;
    };
    dense?: boolean;
    style?: React.CSSProperties;
  }>;

  export const withSnackbar: <P extends object>(
    Component: React.ComponentType<P>
  ) => React.ComponentType<Omit<P, keyof ProviderContext>>;
}
