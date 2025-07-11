declare module 'material-ui-confirm' {
  import { ReactNode } from 'react';
  import { ButtonProps } from '@mui/material';

  interface ConfirmOptions {
    title?: ReactNode;
    description?: ReactNode;
    content?: ReactNode;
    confirmationText?: string;
    cancellationText?: string;
    dialogProps?: object;
    dialogActionsProps?: object;
    titleProps?: object;
    contentProps?: object;
    confirmationButtonProps?: ButtonProps & { [key: string]: any };
    cancellationButtonProps?: ButtonProps & { [key: string]: any };
    confirmationKeyword?: string;
    confirmationKeywordTextFieldProps?: object;
    hideCancelButton?: boolean;
    buttonOrder?: string[];
    allowClose?: boolean;
  }

  interface ConfirmProviderProps {
    children: ReactNode;
    defaultOptions?: ConfirmOptions;
  }

  interface ConfirmProvider {
    (props: ConfirmProviderProps): JSX.Element;
  }

  interface UseConfirmHook {
    (options?: ConfirmOptions): () => Promise<boolean>;
  }

  export const useConfirm: UseConfirmHook;
  export const ConfirmProvider: ConfirmProvider;
  export default useConfirm;
}
