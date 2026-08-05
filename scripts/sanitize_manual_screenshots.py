from pathlib import Path

from PIL import Image, ImageDraw


ASSETS = Path(__file__).resolve().parents[1] / "Documentation" / "Manual" / "assets"


def cover(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str = "DATOS PROTEGIDOS") -> None:
    draw.rounded_rectangle(box, radius=8, fill="#F8FAFC", outline="#CBD5E1", width=2)
    draw.text((box[0] + 12, box[1] + 10), label, fill="#475569")


def sanitize(path: Path) -> None:
    image = Image.open(path).convert("RGB")
    draw = ImageDraw.Draw(image)

    if image.width >= 1500 and path.name != "00_login.png":
        cover(draw, (1425, 12, 1625, 62), "USUARIO ACTIVO")

    if path.name == "01_dashboard.png":
        cover(draw, (420, 165, 555, 198), "USUARIO ACTIVO")
    elif path.name == "03_agenda_citas.png":
        cover(draw, (675, 580, 805, 615), "CITA RESERVADA")
        cover(draw, (810, 580, 945, 615), "CITA RESERVADA")
    elif path.name == "07_dashboard_taller.png":
        cover(draw, (285, 742, 1625, 825))
    elif path.name == "10_ingreso_vehiculos.png":
        cover(draw, (960, 225, 1595, 275), "JEFE DE TALLER ASIGNADO")
    elif path.name == "19_clientes.png":
        cover(draw, (285, 270, 1625, 365))
    elif path.name == "22_tecnicos.png":
        cover(draw, (285, 270, 1625, 365))
    elif path.name == "23_jefes_taller.png":
        cover(draw, (285, 275, 1625, 390))
    elif path.name == "24_sucursales.png":
        cover(draw, (285, 270, 1625, 485), "INFORMACION DE SUCURSALES PROTEGIDA")
    elif path.name == "29_empresas.png":
        cover(draw, (285, 270, 1625, 370), "INFORMACION EMPRESARIAL PROTEGIDA")

    image.save(path, optimize=True)


def main() -> None:
    for screenshot in sorted(ASSETS.glob("*.png")):
        sanitize(screenshot)


if __name__ == "__main__":
    main()
