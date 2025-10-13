// Google Maps API type declarations
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: {
              types?: string[];
              fields?: string[];
              componentRestrictions?: unknown;
            }
          ) => {
            addListener(eventName: string, handler: () => void): void;
            getPlace(): {
              formatted_address?: string;
              name?: string;
              place_id?: string;
              address_components?: Array<{
                long_name: string;
                short_name: string;
                types: string[];
              }>;
              geometry?: unknown;
              types?: string[];
            } | undefined;
          };
          [key: string]: unknown;
        };
        event: {
          clearInstanceListeners(instance: unknown): void;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
    };
  }
}

export {};

