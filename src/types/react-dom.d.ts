declare module 'react-dom/client' {
  export function createRoot(container: Element | null): {
    render(element: any): void;
  };
} 