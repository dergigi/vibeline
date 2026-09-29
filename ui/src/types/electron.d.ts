declare interface Window {
  electron?: {
    showItemInFolder: (filePath: string) => Promise<void>;
  }
} 