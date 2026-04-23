import QRCode from "qrcode";

/**
 * Draw a QR code for `text` onto an existing HTMLCanvasElement.
 * Uses the `qrcode` npm package for standards-compliant generation.
 */
export async function drawQR(
	text: string,
	canvas: HTMLCanvasElement,
	opts?: { moduleSize?: number; quiet?: number },
): Promise<void> {
	const scale = opts?.moduleSize ?? 6;
	const margin = opts?.quiet ?? 4;
	await QRCode.toCanvas(canvas, text, {
		errorCorrectionLevel: "M",
		scale,
		margin,
		color: { dark: "#000000", light: "#ffffff" },
	});
}
