export type Notice = "success" | "error" | "warning" | "info";
export type LoadingOptions = {
  loadingTitle: string;
  successMode: "modal" | "toast" | "none";
  successTitle?: string;
  errorTitle?: string;
  safeRetry?: boolean;
  onInvalid?: (fields: Record<string, string[]>) => void | (() => void);
};

export function confirmed(result: { isConfirmed: boolean }) { return result.isConfirmed; }

export function createRunner(ui: {
  loading(title: string): void;
  close(): void;
  success(title: string): Promise<unknown>;
  toast(title: string): void;
  failure(error: unknown, options: LoadingOptions): Promise<boolean>;
}) {
  return async function run<T>(operation: () => Promise<T>, options: LoadingOptions): Promise<T> {
    for (;;) {
      ui.loading(options.loadingTitle);
      let result: T;
      try {
        result = await operation();
      } catch (error) {
        ui.close();
        if (await ui.failure(error, options) && options.safeRetry) continue;
        throw error;
      }
      ui.close();
      if (options.successMode === "modal") await ui.success(options.successTitle ?? "Berhasil");
      if (options.successMode === "toast") ui.toast(options.successTitle ?? "Perubahan tersimpan");
      return result;
    }
  };
}
