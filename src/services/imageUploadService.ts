import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

const PROFILE_PICTURES_FOLDER = 'profile-pictures';

/**
 * Upload a cadet profile picture to Firebase Storage
 * If an old image URL exists, it will be deleted first
 * @param cadetId - The ID of the cadet
 * @param imageFile - The image file to upload (Blob or File)
 * @param oldImageUrl - Optional URL of the old image to delete
 * @returns The download URL of the uploaded image
 */
export async function uploadCadetProfilePicture(
  cadetId: string,
  imageFile: Blob | File,
  oldImageUrl?: string
): Promise<string> {
  try {
    // Delete old image if it exists and is from Firebase Storage
    if (oldImageUrl && oldImageUrl.includes('firebasestorage.googleapis.com')) {
      try {
        // Extract the path from the URL
        const urlParts = oldImageUrl.split('/');
        const pathIndex = urlParts.findIndex(part => part === 'o');
        if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
          const encodedPath = urlParts[pathIndex + 1].split('?')[0];
          const decodedPath = decodeURIComponent(encodedPath);
          const oldImageRef = ref(storage, decodedPath);
          await deleteObject(oldImageRef);
        }
      } catch (error) {
        console.warn('Failed to delete old image:', error);
        // Continue with upload even if deletion fails
      }
    }

    // Create a reference to the new image location
    const imageRef = ref(storage, `${PROFILE_PICTURES_FOLDER}/${cadetId}.jpg`);

    // Upload the image
    await uploadBytes(imageRef, imageFile, {
      contentType: 'image/jpeg',
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw new Error(`Failed to upload profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a cadet profile picture from Firebase Storage
 * @param cadetId - The ID of the cadet
 */
export async function deleteCadetProfilePicture(cadetId: string): Promise<void> {
  try {
    const imageRef = ref(storage, `${PROFILE_PICTURES_FOLDER}/${cadetId}.jpg`);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    // Don't throw - it's okay if the file doesn't exist
  }
}
