import { ImageResponse } from "next/og";

// Hex de marca inline são whitelisted (DESIGN_SYSTEM §1): ImageResponse/Satori
// renderiza PNG sem Tailwind, então não há classe de token aqui.
// OG image padrão (compartilhamento WhatsApp/Instagram/Google). 1200x630.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Veg.ana — doces sem lactose em Belo Horizonte";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        backgroundColor: "#fbf8ef",
        backgroundImage:
          "radial-gradient(circle at 85% 15%, rgba(222,110,39,0.18), transparent 45%)",
        color: "#2b3210",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: "30px",
          fontWeight: 700,
          color: "#505631",
        }}
      >
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "9999px",
            backgroundColor: "#de6e27",
          }}
        />
        Belo Horizonte
      </div>

      <div style={{ marginTop: "24px", fontSize: "104px", fontWeight: 700, lineHeight: 1.05 }}>
        Veg.ana
      </div>

      <div style={{ marginTop: "12px", fontSize: "44px", color: "#3c4221" }}>
        Doce feito à mão, sem lactose.
      </div>

      <div
        style={{
          marginTop: "40px",
          display: "flex",
          gap: "20px",
          fontSize: "28px",
          fontWeight: 600,
          color: "#505631",
        }}
      >
        <span>100% vegano</span>
        <span style={{ color: "#de6e27" }}>·</span>
        <span>sem lactose</span>
        <span style={{ color: "#de6e27" }}>·</span>
        <span>entrega no mesmo dia</span>
      </div>
    </div>,
    size,
  );
}
