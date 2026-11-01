const CLOUD_NAME = "e6hvyabp";
const UPLOAD_PRESET = "lesson-photos-unsigned";

export async function uploadToCloudinary(blob, filename) {
  const form = new FormData();
  form.append("file", blob, filename || "photo.jpg");
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `업로드 실패 (${res.status})`);
  }

  const data = await res.json();
  return data.secure_url;
}
