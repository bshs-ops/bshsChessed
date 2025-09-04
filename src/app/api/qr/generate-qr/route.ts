// src/app/api/qr/generate-qr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "qr-codes"; // Supabase Storage bucket (private)
const FOLDER = "qrCodes"; // base folder inside bucket

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
function randomSixDigits() {
  return Math.floor(100000 + Math.random() * 900000); // 100000–999999
}

// Content shown inside the QR. You can change these paths as you implement the scanner flow.
function buildIdentityRedeemUrl(token: string) {
  // e.g., your scanning page for identity tokens
  return `${process.env.DOMAIN}/redeemQR/${token}`;
}
function buildPresetRedeemUrl(token: string) {
  // e.g., your scanning page for preset tokens (fund+amount)
  return `${process.env.DOMAIN}/redeemQR/preset/${token}`;
}

type Body =
  | {
      type: "IDENTITY";
      studentName: string;
      studentClass: string;
      studentGrade: string;
    }
  | {
      type: "PRESET";
      groupId: string;
      amount: number;
      label?: string;
    };

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.type || (body.type !== "IDENTITY" && body.type !== "PRESET")) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    if (body.type === "IDENTITY") {
      const { studentName, studentClass, studentGrade } = body;

      if (!studentName || !studentClass || !studentGrade) {
        return NextResponse.json(
          { error: "studentName, studentClass, studentGrade are required" },
          { status: 400 }
        );
      }

      // 1) Create or find the Donor (tweak uniqueness policy as you prefer)
      let donor = await prisma.donor.findFirst({
        where: {
          name: studentName,
          className: studentClass,
          gradeName: studentGrade,
        },
      });

      if (!donor) {
        donor = await prisma.donor.create({
          data: {
            name: studentName,
            className: studentClass,
            gradeName: studentGrade,
          },
        });
      }

      // 2) Create token + PNG buffer
      const token = nanoid();
      const redeemUrl = buildIdentityRedeemUrl(token);

      const pngBuffer = await QRCode.toBuffer(redeemUrl, {
        type: "png",
        width: 500,
        color: { dark: "#000000", light: "#00000000" }, // transparent bg
        errorCorrectionLevel: "M",
      });

      const safeBase = slugify(studentName || "student");
      const fileName = `${safeBase}_${randomSixDigits()}.png`;
      const storagePath = `${FOLDER}/identity/${fileName}`;

      // 3) Upload to Supabase
      const { error: uploadErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, pngBuffer, {
          contentType: "image/png",
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadErr) {
        console.error("Supabase upload error:", uploadErr);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }

      // 4) Permanent proxy URL via your API route that streams from Supabase
      // Using /api/qr/<storagePath> to match your GET route
      const permanentUrl = `${process.env.DOMAIN}/api/qr/${encodeURI(
        storagePath
      )}`;

      // 5) Create QRCode row
      const qr = await prisma.qRCode.create({
        data: {
          value: token,
          type: "IDENTITY",
          donorId: donor.id,
          storagePath,
          qrCodeUrl: permanentUrl,
          isActive: true,
        },
        include: {
          donor: {
            select: { id: true, name: true, className: true, gradeName: true },
          },
        },
      });

      return NextResponse.json({
        ok: true,
        data: {
          id: qr.id,
          type: qr.type,
          code: qr.value,
          imageUrl: qr.qrCodeUrl,
          storagePath: qr.storagePath,
          isActive: qr.isActive,
          createdAt: qr.createdAt,
          identity: {
            donorId: qr.donor?.id,
            name: qr.donor?.name,
            className: qr.donor?.className,
            gradeName: qr.donor?.gradeName,
          },
          preset: null,
        },
      });
    }

    // ===== PRESET branch =====
    const { groupId, amount, label } = body;

    if (!groupId || typeof amount !== "number" || Number.isNaN(amount)) {
      return NextResponse.json(
        { error: "groupId and numeric amount are required" },
        { status: 400 }
      );
    }
    // Ensure group exists; you can also assert type === FUND if desired.
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // 1) Create token + PNG buffer
    const token = nanoid();
    const redeemUrl = buildPresetRedeemUrl(token);

    const pngBuffer = await QRCode.toBuffer(redeemUrl, {
      type: "png",
      width: 500,
      color: { dark: "#000000", light: "#00000000" },
      errorCorrectionLevel: "M",
    });

    const safeBase = slugify(label || group.name || "preset");
    const fileName = `${safeBase}_${randomSixDigits()}.png`;
    const storagePath = `${FOLDER}/preset/${fileName}`;

    // 2) Upload
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, pngBuffer, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadErr) {
      console.error("Supabase upload error:", uploadErr);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // 3) Permanent proxy URL via your API route
    const permanentUrl = `${process.env.DOMAIN}/api/qr/${encodeURI(
      storagePath
    )}`;

    // 4) Create QRCode row (PRESET)
    const qr = await prisma.qRCode.create({
      data: {
        value: token,
        type: "PRESET",
        presetGroupId: group.id,
        presetAmount: amount,
        label: label || null,
        storagePath,
        qrCodeUrl: permanentUrl,
        isActive: true,
      },
      include: {
        presetGroup: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: qr.id,
        type: qr.type,
        code: qr.value,
        imageUrl: qr.qrCodeUrl,
        storagePath: qr.storagePath,
        isActive: qr.isActive,
        createdAt: qr.createdAt,
        identity: null,
        preset: {
          groupId: qr.presetGroup?.id ?? null,
          groupName: qr.presetGroup?.name ?? null,
          amount: qr.presetAmount?.toString() ?? null,
          label: qr.label ?? null,
        },
      },
    });
  } catch (err) {
    console.error("generate-qr error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
