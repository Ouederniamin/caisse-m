import { Platform } from "react-native";
import { API_URL } from "../config";

// Define the upload router type locally to avoid import issues
// This should match the backend's uploadRouter structure
type UploadRouter = {
  tourImageUploader: any;
  hygieneImageUploader: any;
};

// Server URL for UploadThing - use centralized config
const getServerUrl = () => API_URL;

// Only generate React Native helpers on native platforms (not web)
// Web will use base64 approach instead
let useImageUploader: any = null;
let useDocumentUploader: any = null;

if (Platform.OS !== 'web') {
  try {
    const { generateReactNativeHelpers } = require("@uploadthing/expo");
    const helpers = generateReactNativeHelpers<UploadRouter>({
      url: getServerUrl(),
    });
    useImageUploader = helpers.useImageUploader;
    useDocumentUploader = helpers.useDocumentUploader;
  } catch (error) {
    console.warn('[UploadThing] Failed to initialize:', error);
  }
}

export { useImageUploader, useDocumentUploader };

// Legacy exports for backward compatibility
export interface UploadResult {
  url: string;
  uploadedBy?: string;
}

// Re-export types for convenience
export type { UploadRouter };