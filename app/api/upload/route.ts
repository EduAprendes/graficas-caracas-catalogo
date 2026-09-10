import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cloudinary, cloudinaryFolder } from "@/lib/cloudinary";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const fileUri = `data:${file.type};base64,${base64}`;

  try {
    const result = await cloudinary.uploader.upload(fileUri, {
      folder: cloudinaryFolder,
      invalidate: true,
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("[upload]", error);
    return NextResponse.json({ error: "No se pudo subir la imagen" }, { status: 500 });
  }
}
