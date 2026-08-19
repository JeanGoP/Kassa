from __future__ import annotations

from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
MANUAL_DIR = ROOT / "Documentation" / "Manual"
ASSETS_DIR = MANUAL_DIR / "assets"
DOCX_PATH = MANUAL_DIR / "Manual_Usuario_Kassa.docx"
MD_PATH = MANUAL_DIR / "MANUAL_USUARIO_KASSA.md"
LOGO_PATH = ROOT / "TPV.Frontend" / "src" / "assets" / "Logo.png"

BLUE = "2563EB"
DARK = "1F2937"
MID = "475569"
LIGHT = "E8EEF5"
PALE = "F8FAFC"
WHITE = "FFFFFF"


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=80, start=120, bottom=80, end=120) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_repeat_header_text(paragraph, text: str) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MID)


def add_page_number(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Página ")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MID)
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, instr, end])


def keep_paragraph(paragraph) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    keep_next = OxmlElement("w:keepNext")
    keep_next.set(qn("w:val"), "1")
    p_pr.append(keep_next)


def configure_document(doc: Document) -> None:
    section = doc.sections[0]
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.7)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)
    section.header_distance = Inches(0.35)
    section.footer_distance = Inches(0.35)

    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(DARK)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15

    for name, size, before, after, color in (
        ("Title", 28, 0, 14, DARK),
        ("Subtitle", 13, 0, 8, MID),
        ("Heading 1", 17, 18, 9, BLUE),
        ("Heading 2", 13, 14, 7, BLUE),
        ("Heading 3", 11.5, 10, 5, DARK),
    ):
        style = doc.styles[name]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)
        style.font.bold = name != "Subtitle"
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    if "Figure Caption" not in [style.name for style in doc.styles]:
        caption = doc.styles.add_style("Figure Caption", WD_STYLE_TYPE.PARAGRAPH)
    else:
        caption = doc.styles["Figure Caption"]
    caption.font.name = "Calibri"
    caption.font.size = Pt(8.5)
    caption.font.italic = True
    caption.font.color.rgb = RGBColor.from_string(MID)
    caption.paragraph_format.space_before = Pt(3)
    caption.paragraph_format.space_after = Pt(8)
    caption.paragraph_format.keep_with_next = False

    set_repeat_header_text(section.header.paragraphs[0], "KASSA · MANUAL DEL USUARIO FINAL")
    add_page_number(section.footer.paragraphs[0])


def add_title(doc: Document, title: str, level: int = 1) -> None:
    paragraph = doc.add_heading(title.upper(), level=level)
    paragraph.paragraph_format.keep_with_next = True


def add_bullet(doc: Document, text: str) -> None:
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.first_line_indent = Inches(-0.18)
    p.paragraph_format.space_after = Pt(4)
    p.add_run(text)


def add_step(doc: Document, number: int, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.38)
    p.paragraph_format.first_line_indent = Inches(-0.38)
    p.paragraph_format.space_after = Pt(4)
    marker = p.add_run(f"{number}. ")
    marker.bold = True
    marker.font.color.rgb = RGBColor.from_string(BLUE)
    p.add_run(text)


def add_note(doc: Document, label: str, text: str) -> None:
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(6.65)
    cell = table.cell(0, 0)
    set_cell_shading(cell, PALE)
    set_cell_margins(cell, 110, 150, 110, 150)
    p = cell.paragraphs[0]
    run = p.add_run(f"{label.upper()}: ")
    run.bold = True
    run.font.color.rgb = RGBColor.from_string(BLUE)
    p.add_run(text)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def add_figure(doc: Document, filename: str, caption: str, width: float | None = None) -> None:
    image_path = ASSETS_DIR / filename
    if not image_path.exists():
        raise FileNotFoundError(image_path)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_together = True
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(0)
    if width is None:
        width = 6.55 if filename not in {"19b_nuevo_cliente.png", "20b_nuevo_proveedor.png"} else 3.75
    p.add_run().add_picture(str(image_path), width=Inches(width))
    caption_p = doc.add_paragraph(caption, style="Figure Caption")
    caption_p.alignment = WD_ALIGN_PARAGRAPH.CENTER


def add_procedure(doc: Document, title: str, steps: list[str], note: str | None = None) -> None:
    add_title(doc, title, 2)
    for index, step in enumerate(steps, 1):
        add_step(doc, index, step)
    if note:
        add_note(doc, "Importante", note)


def add_section_break(doc: Document, title: str, intro: str) -> None:
    doc.add_page_break()
    add_title(doc, title, 1)
    doc.add_paragraph(intro)


def add_quick_table(doc: Document, headers: list[str], rows: list[list[str]], widths: list[float]) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.style = "Table Grid"
    for idx, header in enumerate(headers):
        cell = table.rows[0].cells[idx]
        cell.width = Inches(widths[idx])
        set_cell_shading(cell, LIGHT)
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        run = cell.paragraphs[0].add_run(header)
        run.bold = True
        run.font.color.rgb = RGBColor.from_string(DARK)
    set_repeat_table_header(table.rows[0])
    for row_index, values in enumerate(rows):
        row = table.add_row()
        for idx, value in enumerate(values):
            cell = row.cells[idx]
            cell.width = Inches(widths[idx])
            set_cell_margins(cell)
            if row_index % 2:
                set_cell_shading(cell, PALE)
            cell.paragraphs[0].add_run(value)
    doc.add_paragraph()


def build_docx() -> None:
    doc = Document()
    configure_document(doc)

    cover = doc.add_paragraph()
    cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover.paragraph_format.space_before = Pt(35)
    cover.add_run().add_picture(str(LOGO_PATH), width=Inches(2.2))
    title = doc.add_paragraph("MANUAL DEL USUARIO FINAL", style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle = doc.add_paragraph("Operación comercial, inventario y posventa", style="Subtitle")
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    version = doc.add_paragraph("Versión 1.0 · Agosto de 2026")
    version.alignment = WD_ALIGN_PARAGRAPH.CENTER
    version.paragraph_format.space_before = Pt(22)
    add_note(doc, "Alcance", "Guía de uso para administradores, cajeros, asesores, personal de inventario y equipo de taller. Las capturas provienen del ambiente productivo y fueron anonimizadas.")

    doc.add_page_break()
    add_title(doc, "Contenido y convenciones", 1)
    doc.add_paragraph("Este manual explica los flujos habituales de Kassa en el orden recomendado de operación. Los nombres de botones, campos y opciones se muestran en mayúsculas para coincidir con la interfaz.")
    add_quick_table(
        doc,
        ["Símbolo", "Significado"],
        [
            ["IMPORTANTE", "Condición que debe verificarse antes de continuar."],
            ["RESULTADO", "Estado esperado al terminar el procedimiento."],
            ["PERMISO", "La opción puede depender del rol asignado al usuario."],
        ],
        [1.4, 5.1],
    )
    add_title(doc, "Mapa del sistema", 2)
    for item in (
        "OPERACIONES: punto de venta, agenda, cotizaciones, historial de ventas y entradas de mercancía.",
        "ÓRDENES DE SERVICIO: tablero de taller, expediente unificado, alistamientos, vehículos y garantías.",
        "CATÁLOGOS: productos, categorías, marcas/modelos, clientes, proveedores, servicios, técnicos, jefes de taller y sucursales.",
        "MOVIMIENTOS: inventario por ubicación, ajustes y traslados.",
        "SEGURIDAD Y REPORTES: empresas, usuarios, roles, permisos e informes.",
    ):
        add_bullet(doc, item)

    add_section_break(doc, "1. Acceso y navegación", "El acceso requiere un usuario activo. Las opciones visibles dependen de los permisos configurados para su rol.")
    add_figure(doc, "00_login.png", "Figura 1. Pantalla de inicio de sesión.")
    add_procedure(doc, "Iniciar sesión", [
        "Abra https://www.kassapp.com/ en el navegador.",
        "Escriba su correo en USUARIO y su clave en CONTRASEÑA.",
        "Seleccione INICIAR SESIÓN.",
        "Compruebe que el panel principal muestre la empresa y la sucursal correctas.",
    ], "No comparta la contraseña. Solicite al administrador el restablecimiento cuando no pueda ingresar.")
    add_figure(doc, "01_dashboard.png", "Figura 2. Panel principal con indicadores y accesos rápidos.")
    add_procedure(doc, "Usar el panel principal", [
        "Revise los indicadores de ventas, órdenes activas, inventario bajo y clientes nuevos.",
        "Use el menú lateral para abrir el módulo requerido.",
        "Use los accesos rápidos para iniciar una venta, consultar inventario o abrir el taller.",
        "Al terminar la jornada, abra el menú del usuario y cierre la sesión.",
    ])

    add_section_break(doc, "2. Configuración inicial", "Estas tareas corresponden normalmente al administrador. Deben completarse antes de operar ventas, inventario o taller.")
    add_figure(doc, "29_empresas.png", "Figura 3. Administración de empresas.")
    add_procedure(doc, "Registrar o actualizar la empresa", [
        "Abra SEGURIDAD > EMPRESAS.",
        "Seleccione NUEVA EMPRESA o EDITE la empresa existente.",
        "Registre RAZÓN SOCIAL, NIT y demás datos de contacto.",
        "Guarde y confirme que la empresa aparezca activa.",
    ])
    add_figure(doc, "24_sucursales.png", "Figura 4. Catálogo de sucursales, que actúan como bodegas.")
    add_procedure(doc, "Crear una sucursal", [
        "Abra CATÁLOGOS > SUCURSALES y seleccione NUEVA SUCURSAL.",
        "Registre nombre, dirección, teléfono, correo, departamento y ciudad.",
        "Asigne la MARCA PRINCIPAL y, cuando aplique, el JEFE DE TALLER.",
        "Guarde. Después cree las ubicaciones físicas desde INVENTARIO.",
    ], "En Kassa cada sucursal funciona como una bodega. Las ubicaciones representan zonas internas como RECEPCIÓN, ESTANTE A o MOSTRADOR.")
    add_figure(doc, "30_usuarios.png", "Figura 5. Administración de usuarios.")
    add_procedure(doc, "Crear un usuario", [
        "Abra SEGURIDAD > USUARIOS y seleccione NUEVO USUARIO.",
        "Registre correo, nombres, apellidos y contraseña inicial.",
        "Asigne la EMPRESA, la SUCURSAL y un ROL.",
        "Guarde e indique al usuario que cambie su clave según la política interna.",
    ])
    add_figure(doc, "31_roles_permisos.png", "Figura 6. Roles y permisos del sistema.")
    add_procedure(doc, "Configurar un rol", [
        "Abra SEGURIDAD > ROLES Y PERMISOS.",
        "Cree un rol o seleccione uno existente.",
        "Marque únicamente los permisos que requiere esa función.",
        "Guarde y verifique el acceso con un usuario de prueba del mismo rol.",
    ], "Aplique el principio de mínimo privilegio. Reserve empresas, usuarios, roles y anulaciones para personal autorizado.")

    add_section_break(doc, "3. Catálogos maestros", "Los catálogos evitan registros duplicados y alimentan los documentos comerciales, el inventario y la trazabilidad de posventa.")
    add_figure(doc, "17_categorias.png", "Figura 7. Categorías y clasificación de artículos.")
    add_procedure(doc, "Crear categorías", [
        "Abra CATÁLOGOS > CATEGORÍAS.",
        "Seleccione NUEVA CATEGORÍA.",
        "Registre el nombre y, si aplica, la categoría superior.",
        "Guarde y use la clasificación de forma consistente en productos y reportes.",
    ])
    add_figure(doc, "18_marcas_modelos.png", "Figura 8. Maestros formales de marcas y modelos.")
    add_procedure(doc, "Registrar marcas y modelos", [
        "Abra CATÁLOGOS > MARCAS Y MODELOS.",
        "Cree primero la MARCA.",
        "Seleccione la marca y agregue cada MODELO asociado.",
        "Use estos registros al crear vehículos, productos y aplicabilidades.",
    ], "La marca pertenece al vehículo, artículo o documento. No debe deducirse únicamente por la sucursal.")
    add_figure(doc, "16b_nuevo_producto.png", "Figura 9. Formulario avanzado de producto y sus pestañas.", 6.35)
    add_procedure(doc, "Crear un producto o servicio", [
        "Abra CATÁLOGOS > PRODUCTOS y seleccione NUEVO PRODUCTO.",
        "En CARACTERÍSTICAS seleccione PRODUCTO o SERVICIO y registre SKU, código de barras, nombre, descripción, categoría y marca.",
        "Defina UNIDAD BASE, UNIDAD DE COMPRA y UNIDAD DE VENTA, junto con sus factores de conversión. Active FRACCIONADO cuando admita cantidades decimales.",
        "Complete PRECIOS e IMPUESTOS.",
        "En CATÁLOGO indique fabricante, referencia oficial y origen: ORIGINAL, HOMÓLOGO o GENÉRICO.",
        "En APLICABILIDAD vincule los modelos de vehículo compatibles.",
        "En REFERENCIAS registre equivalencias y sustituciones.",
        "En KIT Y REPOSICIÓN agregue componentes, mínimos, máximos, punto de pedido y tiempo de abastecimiento.",
        "Guarde y confirme que el producto pueda encontrarse por nombre, SKU o código de barras.",
    ])
    add_figure(doc, "19b_nuevo_cliente.png", "Figura 10. Registro de cliente natural o jurídico.")
    add_procedure(doc, "Crear un cliente", [
        "Abra CATÁLOGOS > CLIENTES y seleccione NUEVO CLIENTE.",
        "Elija NATURAL o JURÍDICA.",
        "Registre tipo y número de identificación; complete nombres o razón social.",
        "Complete departamento, ciudad, teléfono, dirección y correo.",
        "Guarde y confirme que no exista otro cliente con la misma identificación.",
    ])
    add_figure(doc, "20b_nuevo_proveedor.png", "Figura 11. Registro de proveedor oficial o tercero.")
    add_procedure(doc, "Crear un proveedor", [
        "Abra CATÁLOGOS > PROVEEDORES y seleccione NUEVO PROVEEDOR.",
        "Elija NATURAL o JURÍDICA y registre la identificación.",
        "Seleccione TERCERO u OFICIAL. Si es OFICIAL, asigne la MARCA OFICIAL correspondiente.",
        "Complete nombre, contacto, teléfono, correo y dirección.",
        "Guarde el proveedor.",
    ])
    add_figure(doc, "21_servicios_moto.png", "Figura 12. Catálogo de servicios de motocicleta.")
    add_procedure(doc, "Mantener servicios y personal de taller", [
        "Abra SERVICIOS MOTO. El sistema presenta diez servicios predeterminados para iniciar la operación.",
        "Revise nombre, descripción, tiempo estimado, precio fijo antes de IVA, porcentaje de IVA y orden de visualización.",
        "Cree servicios adicionales para los trabajos propios del taller y defina su precio e impuesto.",
        "Abra TÉCNICOS y registre el personal que ejecuta trabajos.",
        "Abra JEFES DE TALLER y registre responsables; luego asígnelos a las sucursales.",
    ])
    add_figure(doc, "22_tecnicos.png", "Figura 13. Catálogo de técnicos.")

    add_section_break(doc, "4. Caja, ventas y cotizaciones", "La secuencia diaria recomendada es abrir caja, vender o cotizar, gestionar ajustes autorizados y cerrar caja.")
    add_figure(doc, "28_caja.png", "Figura 14. Apertura y cierre de caja.")
    add_procedure(doc, "Abrir caja", [
        "Abra CAJA.",
        "Compruebe que no exista una sesión activa para su usuario y sucursal.",
        "Cuente el efectivo inicial y regístrelo en SALDO INICIAL.",
        "Seleccione ABRIR CAJA.",
    ])
    add_figure(doc, "02_punto_venta.png", "Figura 15. Punto de venta.")
    add_procedure(doc, "Registrar una venta", [
        "Abra OPERACIONES > PUNTO DE VENTA.",
        "Busque el cliente y selecciónelo. Créelo desde CLIENTES si aún no existe.",
        "Busque cada producto por nombre, SKU o código de barras y agréguelo al carrito.",
        "Revise cantidades, precios, descuentos, impuestos y total.",
        "Seleccione PAGAR y elija EFECTIVO, TARJETA o TRANSFERENCIA.",
        "Para efectivo, registre el valor recibido y verifique el cambio.",
        "Confirme el pago y entregue o imprima el comprobante.",
    ], "No confirme el pago hasta validar cliente, productos, cantidades, impuestos y medio de pago.")
    add_figure(doc, "04_cotizaciones.png", "Figura 16. Creación y consulta de cotizaciones.")
    add_procedure(doc, "Crear una cotización", [
        "Abra OPERACIONES > COTIZACIONES.",
        "Registre nombre, teléfono y correo del solicitante.",
        "Busque y agregue los productos o servicios; ajuste cantidades y precios autorizados.",
        "Revise totales y seleccione GUARDAR.",
        "Genere el PDF para entregar al cliente.",
    ])
    add_figure(doc, "05_historial_ventas.png", "Figura 17. Historial de ventas y ajustes.")
    add_procedure(doc, "Consultar ventas, devoluciones y notas crédito", [
        "Abra OPERACIONES > HISTORIAL DE VENTAS y aplique los filtros disponibles.",
        "Abra el detalle de la venta y confirme productos, cantidades, costos y medios de pago.",
        "Para devolver mercancía, seleccione DEVOLUCIÓN CON INVENTARIO, indique motivo y cantidades.",
        "Para un ajuste financiero sin retorno físico, seleccione NOTA CRÉDITO SIN INVENTARIO.",
        "Revise el saldo parcial y confirme el ajuste autorizado.",
    ], "Las devoluciones y notas crédito afectan trazabilidad contable. Deben llevar motivo y autorización interna.")
    add_procedure(doc, "Cerrar caja", [
        "Regrese a CAJA al finalizar el turno.",
        "Compare total vendido, saldo esperado y comprobantes por medio de pago.",
        "Cuente el efectivo real y regístrelo como SALDO FINAL.",
        "Seleccione CERRAR CAJA y documente cualquier diferencia según el procedimiento interno.",
    ])

    add_section_break(doc, "5. Entradas de mercancía", "Una entrada registra la recepción efectiva de artículos y los ubica físicamente dentro de la sucursal elegida.")
    add_figure(doc, "06_entradas_mercancia.png", "Figura 18. Consulta de entradas de mercancía.")
    add_procedure(doc, "Consultar entradas", [
        "Abra OPERACIONES > ENTRADAS DE MERCANCÍA.",
        "Use los filtros para localizar la recepción por proveedor, documento o fecha.",
        "Abra el detalle para verificar artículos, unidades, costos, impuestos, ubicación y documento de origen.",
        "Use IMPRIMIR cuando requiera soporte físico.",
    ])
    add_figure(doc, "06b_nueva_entrada.png", "Figura 19. Formulario de nueva entrada con recepción y ubicación.")
    add_procedure(doc, "Registrar una entrada", [
        "Seleccione NUEVA ENTRADA.",
        "Elija PROVEEDOR y registre fecha del documento, fecha de factura, factura o remisión.",
        "Seleccione SUCURSAL y FECHA DE RECEPCIÓN EFECTIVA.",
        "Si existe pedido, registre NÚMERO DE PEDIDO y FECHA DEL PEDIDO.",
        "Seleccione la UBICACIÓN DE RECEPCIÓN dentro de la sucursal.",
        "Busque cada artículo y registre CANTIDAD, UNIDAD EXACTA DE COMPRA, COSTO UNITARIO e IMPUESTO.",
        "Agregue flete e impuesto de flete cuando aplique.",
        "Compare cantidades y costos contra la factura física.",
        "Seleccione GUARDAR ENTRADA y compruebe el movimiento en INVENTARIO.",
    ], "La entrada no debe quedar solamente en la sucursal. Siempre seleccione la ubicación física donde se recibió la mercancía.")

    add_section_break(doc, "6. Inventario, ubicaciones y movimientos", "La sucursal representa la bodega y la ubicación identifica el punto físico donde permanece cada existencia.")
    add_figure(doc, "25_inventario.png", "Figura 20. Inventario por sucursal, ubicación y movimiento.")
    add_procedure(doc, "Crear una ubicación", [
        "Abra MOVIMIENTOS > INVENTARIO.",
        "Seleccione la SUCURSAL que funcionará como bodega.",
        "Abra la sección UBICACIONES y seleccione NUEVA UBICACIÓN.",
        "Registre CÓDIGO, NOMBRE y DESCRIPCIÓN; por ejemplo REC, RECEPCIÓN DE MERCANCÍA.",
        "Marque ES PREDETERMINADA solamente para la ubicación que deba proponerse por defecto.",
        "Guarde y repita para estantes, vitrinas, mostrador o zonas de taller.",
    ])
    add_figure(doc, "26_ajustes_inventario.png", "Figura 21. Ajuste de inventario por ubicación.")
    add_procedure(doc, "Asignar o corregir ubicación de un producto existente", [
        "Realice un conteo físico antes de modificar existencias.",
        "Abra MOVIMIENTOS > AJUSTES DE INVENTARIO.",
        "Seleccione SUCURSAL y UBICACIÓN FÍSICA.",
        "Busque el producto y revise la cantidad y el costo actuales.",
        "Registre la NUEVA CANTIDAD y, si corresponde, el NUEVO COSTO.",
        "Escriba un MOTIVO claro y guarde el ajuste.",
    ], "No use ajustes para mover mercancía entre ubicaciones cuando ya existe stock en el origen. Para eso utilice TRASLADOS.")
    add_figure(doc, "27_traslados.png", "Figura 22. Traslado entre sucursales o ubicaciones.")
    add_procedure(doc, "Trasladar mercancía", [
        "Abra MOVIMIENTOS > TRASLADOS.",
        "Seleccione SUCURSAL y UBICACIÓN DE ORIGEN.",
        "Seleccione SUCURSAL y UBICACIÓN DE DESTINO.",
        "Busque el producto y compruebe la existencia disponible en el origen.",
        "Registre la cantidad, incluida una cantidad decimal cuando la unidad lo permita.",
        "Agregue observaciones y confirme el traslado.",
        "Verifique que el movimiento descontó el origen y aumentó el destino.",
    ], "Origen y destino deben ser diferentes. El sistema no permite trasladar más cantidad que la disponible.")

    add_section_break(doc, "7. Agenda de citas", "La agenda organiza las solicitudes del taller y permite compartir un enlace público de reserva.")
    add_figure(doc, "03_agenda_citas.png", "Figura 23. Agenda mensual de citas.")
    add_procedure(doc, "Configurar y compartir una agenda", [
        "Abra OPERACIONES > AGENDA.",
        "Cree o seleccione una agenda para la sucursal o equipo correspondiente.",
        "Configure los servicios disponibles y los horarios de atención.",
        "Copie el ENLACE PÚBLICO y compártalo por el canal autorizado.",
    ])
    add_procedure(doc, "Gestionar una cita", [
        "Seleccione el día y la franja de atención.",
        "Registre cliente, servicio, fecha, hora y observaciones.",
        "Guarde la cita con estado PENDIENTE.",
        "Actualícela a CONFIRMADA cuando el cliente acepte.",
        "Al prestar el servicio, márquela FINALIZADA; use CANCELADA cuando no se realizará.",
    ])

    add_section_break(doc, "8. Vehículos y taller", "El expediente de taller reúne ingreso, diagnóstico, trabajos y repuestos, cierre y factura en una sola pantalla. El VIN o chasis de 17 caracteres conecta vehículo, propietario, historial y garantías.")
    add_figure(doc, "09_vehiculos.png", "Figura 24. Maestro de vehículos UIO.")
    add_procedure(doc, "Crear o actualizar un vehículo", [
        "Abra ÓRDENES DE SERVICIO > VEHÍCULOS UIO.",
        "Busque primero por VIN, placa o motor para evitar duplicados.",
        "Registre el VIN o chasis completo de 17 caracteres.",
        "Complete motor, placa, marca, modelo, año, fecha de venta, propietario actual, sucursal y kilometraje.",
        "Guarde y consulte el historial para revisar visitas, alistamientos y revisiones anteriores.",
    ], "El VIN es el identificador principal del vehículo. Verifíquelo directamente contra el vehículo o documento de propiedad.")
    add_figure(doc, "07_dashboard_taller.png", "Figura 25. Tablero de control del taller.")
    add_procedure(doc, "Controlar el trabajo del taller", [
        "Abra DASHBOARD TALLER.",
        "Revise órdenes por estado, carga de técnicos, entregas pendientes y alertas.",
        "Abra EXPEDIENTE DE TALLER, seleccione la orden y use sus pestañas INGRESO, DIAGNÓSTICO, TRABAJOS Y REPUESTOS o CIERRE Y FACTURA.",
        "Priorice órdenes vencidas o con fecha prometida próxima.",
    ])
    add_figure(doc, "10_ingreso_vehiculos.png", "Figura 26. Pestaña de ingreso del expediente.")
    add_procedure(doc, "Etapa 1: recibir el vehículo", [
        "Abra EXPEDIENTE DE TALLER y seleccione NUEVO INGRESO.",
        "Verifique primero la fecha y hora de ingreso, busque o registre el cliente y asigne un técnico activo de la sucursal.",
        "Registre el vehículo y confirme VIN, placa, motor, marca, modelo y año.",
        "Registre TIPO DE ORDEN, ORIGEN, kilometraje y fecha prometida.",
        "Documente el estado visual y adjunte fotografías de recepción.",
        "Registre observaciones y obtenga la firma del cliente.",
        "Guarde la orden. El expediente se abrirá en la misma pantalla para continuar.",
    ])
    add_figure(doc, "11_diagnostico.png", "Figura 27. Pestaña de diagnóstico del expediente.")
    add_procedure(doc, "Etapa 2: diagnosticar", [
        "En el expediente seleccionado, abra DIAGNÓSTICO.",
        "Registre el problema informado y la conclusión técnica.",
        "Indique si el cliente aprobó el diagnóstico y la fecha de aprobación.",
        "Guarde. El sistema conserva la fecha y el responsable del diagnóstico.",
    ])
    add_figure(doc, "12_trabajos_servicios.png", "Figura 28. Pestaña de trabajos y repuestos.")
    add_procedure(doc, "Etapa 3: asignar trabajos", [
        "En el mismo expediente, abra TRABAJOS Y REPUESTOS.",
        "Busque y agregue los servicios aprobados desde el catálogo.",
        "Compruebe el técnico asignado desde el ingreso, el tiempo, el precio fijo y el IVA cargados desde el catálogo.",
        "Seleccione responsable de pago y si la línea suma a la factura.",
        "Cambie cada trabajo a REALIZADO cuando termine y registre el tiempo real solicitado.",
    ])
    add_figure(doc, "13_repuestos_insumos.png", "Figura 29. Sección de repuestos e insumos dentro de trabajos.")
    add_procedure(doc, "Etapa 4: cargar repuestos e insumos", [
        "Permanezca en TRABAJOS Y REPUESTOS y ubique la sección de artículos.",
        "Busque cada artículo y confirme su existencia disponible.",
        "Registre cantidad, tipo de línea y responsable de pago.",
        "Confirme el consumo. El sistema descuenta inventario y lo vincula a la orden sin generar todavía la factura.",
    ])
    add_figure(doc, "14_cierre_entrega.png", "Figura 30. Pestaña de cierre, entrega y factura.")
    add_procedure(doc, "Etapa 5: cerrar y entregar", [
        "En el mismo expediente, abra CIERRE Y FACTURA.",
        "Compruebe que el diagnóstico esté completo y todos los trabajos estén REALIZADOS.",
        "Complete el checklist y registre fecha, usuario que recibe y notas de entrega.",
        "Finalice la orden, seleccione el medio de pago y genere la factura una sola vez.",
        "Compruebe que la orden quede CERRADA y revise la trazabilidad.",
    ], "Una orden anulada debe conservar fecha, motivo y usuario responsable. No elimine el historial operativo.")

    add_section_break(doc, "9. Órdenes de alistamiento", "El alistamiento documenta la preparación del vehículo, sus hallazgos y los consumos realizados antes de la entrega o apertura de garantía.")
    add_figure(doc, "08_alistamientos.png", "Figura 31. Orden de alistamiento.")
    add_procedure(doc, "Registrar un alistamiento", [
        "Abra ÓRDENES DE SERVICIO > ALISTAMIENTOS y seleccione NUEVA ORDEN.",
        "Registre referencia, sucursal, cliente y ejecutor.",
        "Busque o complete VIN, motor, placa, marca, modelo, año y kilometraje.",
        "Indique si el hallazgo ABRE GARANTÍA.",
        "Registre hallazgos, observaciones y revisiones realizadas.",
        "Agregue repuestos e insumos consumidos con sus cantidades y unidades.",
        "Guarde y confirme que el alistamiento aparezca en el historial del vehículo.",
    ])

    add_section_break(doc, "10. Garantías", "La garantía acompaña el caso desde la detección de la falla hasta la aprobación, facturación y pago del fabricante.")
    add_figure(doc, "15_garantias.png", "Figura 32. Consulta y seguimiento de garantías.")
    add_procedure(doc, "Consultar una garantía", [
        "Abra ÓRDENES DE SERVICIO > GARANTÍAS.",
        "Filtre por vehículo, estado, orden de taller o referencia.",
        "Abra el caso para revisar diagnóstico, piezas, autorización, radicación, decisión, factura y pago.",
        "Actualice el estado cada vez que reciba respuesta del fabricante.",
    ])
    add_figure(doc, "15b_nueva_garantia.png", "Figura 33. Registro completo de garantía.", 6.35)
    add_procedure(doc, "Registrar y tramitar una garantía", [
        "Seleccione NUEVA GARANTÍA y busque el vehículo.",
        "Elija tipo CORRECTIVA o CERO KM y detección en RECEPCIÓN o ALISTAMIENTO.",
        "Asocie la ORDEN DE TALLER, fecha de falla y kilometraje.",
        "Registre causa atribuida, modo de falla, descripción y pieza causante.",
        "Agregue las piezas reemplazadas.",
        "Registre autorización del fabricante y datos de radicación.",
        "Actualice el estado a APROBADA o RECHAZADA; para rechazo, diligencie el motivo.",
        "Complete valores reconocidos, horas y mano de obra aprobada.",
        "Registre factura al fabricante y, cuando ingrese el dinero, fecha y referencia de pago.",
        "Guarde cada etapa para mantener la trazabilidad completa.",
    ])

    add_section_break(doc, "11. Reportes", "Los reportes permiten revisar la operación por fechas, sucursales, productos y cotizaciones.")
    add_figure(doc, "32_reportes.png", "Figura 34. Centro de reportes.")
    add_procedure(doc, "Generar un reporte", [
        "Abra REPORTES.",
        "Seleccione VENTAS POR SUCURSAL, MARGEN POR PRODUCTO, COTIZACIONES EMITIDAS o HISTORIAL DE BÚSQUEDA.",
        "Defina fecha inicial, fecha final y los filtros específicos.",
        "Seleccione GENERAR.",
        "Revise los totales y exporte o imprima cuando la opción esté disponible.",
    ], "Restrinja las fechas para mejorar la velocidad y facilitar la revisión de resultados.")

    add_section_break(doc, "12. Controles diarios y solución de problemas", "Estas listas ayudan a mantener la calidad de los datos y resolver los incidentes más comunes sin alterar la trazabilidad.")
    add_title(doc, "Inicio de jornada", 2)
    for item in (
        "Confirmar empresa, sucursal y usuario.",
        "Abrir caja con el efectivo contado.",
        "Revisar citas, órdenes activas y entregas prometidas.",
        "Revisar alertas de inventario bajo y mercancía pendiente de ubicar.",
    ):
        add_bullet(doc, item)
    add_title(doc, "Fin de jornada", 2)
    for item in (
        "Cerrar o actualizar citas y órdenes atendidas.",
        "Confirmar que entradas, ajustes y traslados tengan soporte y motivo.",
        "Conciliar medios de pago y cerrar caja.",
        "Cerrar sesión en equipos compartidos.",
    ):
        add_bullet(doc, item)
    add_quick_table(
        doc,
        ["Situación", "Qué revisar"],
        [
            ["No aparece una opción", "Permisos del rol, empresa y sucursal asignadas."],
            ["No aparece un producto", "Estado activo, categoría, sucursal, ubicación y existencia."],
            ["No permite trasladar", "Stock del origen, unidad, cantidad y destinos diferentes."],
            ["No permite recibir mercancía", "Proveedor, documento, sucursal, fecha y ubicación de recepción."],
            ["Ingreso de vehículo rechazado", "Cliente, VIN de 17 caracteres, marca/modelo del catálogo, sucursal, combustible y firma."],
            ["VIN rechazado", "Debe tener exactamente 17 caracteres y no estar duplicado."],
            ["Totales de venta diferentes", "Cantidades, impuestos, descuentos, devolución o nota crédito."],
            ["Orden no avanza", "Etapa previa, estado, autorizaciones, trabajos y repuestos pendientes."],
        ],
        [2.1, 4.4],
    )
    add_note(doc, "Soporte", "Al reportar un incidente indique usuario, empresa, sucursal, fecha y hora, módulo, número de documento y pasos realizados. Adjunte una captura sin contraseñas ni información sensible innecesaria.")

    doc.add_page_break()
    add_title(doc, "Resumen de flujos", 1)
    add_quick_table(
        doc,
        ["Proceso", "Secuencia recomendada"],
        [
            ["Venta", "Abrir caja > Seleccionar cliente > Agregar artículos > Cobrar > Entregar comprobante > Cerrar caja."],
            ["Compra", "Crear proveedor > Registrar entrada > Seleccionar sucursal y ubicación > Verificar inventario."],
            ["Ubicación", "Crear ubicación > Entrada directa o traslado > Verificar movimiento y saldo."],
            ["Taller", "Vehículo UIO > Expediente de taller > Ingreso > Diagnóstico > Trabajos > Repuestos > Cierre y factura."],
            ["Garantía", "Detectar > Diagnosticar > Autorizar > Radicar > Aprobar/Rechazar > Facturar > Registrar pago."],
        ],
        [1.35, 5.15],
    )
    doc.add_paragraph("Fin del manual.").alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.core_properties.title = "Manual del usuario final de Kassa"
    doc.core_properties.subject = "Operación comercial, inventario y posventa"
    doc.core_properties.author = "Kassa"
    doc.core_properties.keywords = "Kassa, TPV, inventario, taller, posventa, manual"
    doc.core_properties.comments = "Capturas de producción anonimizadas."
    DOCX_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.save(DOCX_PATH)


def build_markdown() -> None:
    md = f"""# MANUAL DEL USUARIO FINAL DE KASSA

**Versión 1.0 · Agosto de 2026**  
**Alcance:** operación comercial, inventario y posventa.

> Las capturas provienen del ambiente productivo y fueron anonimizadas. Los nombres de campos y botones se presentan en mayúsculas para coincidir con la interfaz.

## 1. ACCESO Y NAVEGACIÓN

![Inicio de sesión](assets/00_login.png)

1. Abra <https://www.kassapp.com/>.
2. Escriba el USUARIO y la CONTRASEÑA.
3. Seleccione INICIAR SESIÓN.
4. Confirme la empresa y la sucursal.

![Panel principal](assets/01_dashboard.png)

El panel resume ventas, órdenes activas, inventario bajo, clientes nuevos y estados del taller. Las opciones visibles dependen de los permisos del rol.

## 2. CONFIGURACIÓN INICIAL

1. En SEGURIDAD > EMPRESAS registre RAZÓN SOCIAL y NIT.
2. En CATÁLOGOS > SUCURSALES cree cada sede, asígnele MARCA PRINCIPAL y JEFE DE TALLER.
3. En SEGURIDAD > ROLES Y PERMISOS configure el acceso mínimo necesario.
4. En SEGURIDAD > USUARIOS asigne empresa, sucursal y rol.

![Sucursales](assets/24_sucursales.png)

Cada sucursal funciona como una bodega. Las ubicaciones representan zonas físicas internas.

## 3. CATÁLOGOS

Antes de operar cree categorías, marcas/modelos, productos, clientes y proveedores. Revise los servicios de moto predeterminados y complete el personal de taller.

![Marcas y modelos](assets/18_marcas_modelos.png)

### PRODUCTOS

1. Abra CATÁLOGOS > PRODUCTOS y seleccione NUEVO PRODUCTO.
2. Registre tipo, SKU, código, nombre, categoría y marca.
3. Defina unidades base, compra y venta con sus factores; active FRACCIONADO cuando admita decimales.
4. Complete precios, impuestos, fabricante, origen, aplicabilidad, equivalencias, sustituciones, kits y reposición.
5. Guarde y compruebe la búsqueda por nombre, SKU o código.

![Producto](assets/16b_nuevo_producto.png)

### CLIENTES Y PROVEEDORES

Evite duplicados por identificación. En proveedores seleccione TERCERO u OFICIAL; cuando sea oficial, asigne la marca correspondiente.

![Cliente](assets/19b_nuevo_cliente.png)

![Proveedor](assets/20b_nuevo_proveedor.png)

### SERVICIOS DE MOTO Y PERSONAL

1. Abra SERVICIOS MOTO y revise los diez servicios predeterminados.
2. Ajuste nombre, descripción, tiempo estimado, precio fijo antes de IVA, porcentaje de IVA y orden de visualización.
3. Cree servicios adicionales para los trabajos propios del taller y defina su precio e impuesto.
4. En TÉCNICOS registre el personal que ejecuta los trabajos.
5. En JEFES DE TALLER registre los responsables y asígnelos a las sucursales.

![Servicios de moto](assets/21_servicios_moto.png)

![Técnicos](assets/22_tecnicos.png)

## 4. CAJA, VENTAS Y COTIZACIONES

1. Abra CAJA, cuente el efectivo y registre SALDO INICIAL.
2. En PUNTO DE VENTA seleccione cliente y artículos.
3. Revise cantidades, precios, descuentos, impuestos y total.
4. Seleccione PAGAR, elija el medio y confirme.
5. Entregue el comprobante.
6. Al terminar, concilie y cierre caja con el SALDO FINAL real.

![Punto de venta](assets/02_punto_venta.png)

En COTIZACIONES registre solicitante, artículos y cantidades; guarde y genere el PDF. En HISTORIAL DE VENTAS consulte detalles y registre devoluciones con inventario o notas crédito sin inventario, siempre con motivo.

## 5. ENTRADAS DE MERCANCÍA

1. Abra OPERACIONES > ENTRADAS DE MERCANCÍA > NUEVA ENTRADA.
2. Seleccione proveedor y registre fechas, factura o remisión.
3. Seleccione SUCURSAL, RECEPCIÓN EFECTIVA y UBICACIÓN DE RECEPCIÓN.
4. Registre pedido asociado cuando exista.
5. Agregue artículos con cantidad, unidad exacta, costo e impuesto.
6. Agregue flete cuando aplique, verifique y guarde.

![Nueva entrada](assets/06b_nueva_entrada.png)

**Importante:** toda entrada debe indicar la ubicación física de recepción.

## 6. INVENTARIO, UBICACIONES Y MOVIMIENTOS

### CREAR UNA UBICACIÓN

1. Abra MOVIMIENTOS > INVENTARIO y seleccione la sucursal.
2. En UBICACIONES seleccione NUEVA UBICACIÓN.
3. Registre código, nombre y descripción.
4. Marque ES PREDETERMINADA solo para la ubicación habitual.

### ASIGNAR UN PRODUCTO EXISTENTE

Use AJUSTES para establecer el saldo físico inicial o corregirlo, indicando ubicación, nueva cantidad, costo y motivo. Use TRASLADOS cuando el producto ya tiene saldo en otra ubicación.

![Ajustes](assets/26_ajustes_inventario.png)

### TRASLADAR

1. Seleccione sucursal/ubicación de origen y destino.
2. Busque el producto y verifique disponibilidad.
3. Registre cantidad y observaciones.
4. Confirme y verifique ambos saldos.

![Traslados](assets/27_traslados.png)

## 7. AGENDA

Configure una agenda, servicios y horarios. Comparta el enlace público autorizado. Gestione cada cita como PENDIENTE, CONFIRMADA, FINALIZADA o CANCELADA.

![Agenda](assets/03_agenda_citas.png)

## 8. VEHÍCULOS Y ÓRDENES DE SERVICIO

El VIN o chasis de 17 caracteres es el identificador principal. Abra ÓRDENES DE SERVICIO > EXPEDIENTE DE TALLER para gestionar todo el proceso sin cambiar de pantalla. A la izquierda se buscan y seleccionan órdenes; a la derecha permanecen disponibles las pestañas INGRESO, DIAGNÓSTICO, TRABAJOS Y REPUESTOS, y CIERRE Y FACTURA.

### CREAR Y COMPLETAR UN EXPEDIENTE

1. Seleccione NUEVO INGRESO. Verifique primero la fecha y hora, seleccione el cliente y asigne un técnico activo de la sucursal. Después registre vehículo, kilometraje, tipo, origen, estado visual, fotografías y firma del cliente. Al guardar, la orden se abre en el mismo expediente.
2. En DIAGNÓSTICO registre el problema informado, la conclusión técnica y la aprobación del cliente. El sistema conserva fecha y responsable.
3. En TRABAJOS Y REPUESTOS busque un servicio del catálogo. El sistema carga el técnico asignado en el ingreso, el tiempo, el precio fijo y el IVA configurados. Defina pagador y tipo de servicio. Para mantenimiento preventivo registre el kilometraje de revisión. Al marcar un trabajo como REALIZADO, indique su tiempo real.
4. En la misma pestaña, busque los repuestos e insumos, indique cantidad, tipo y pagador, y confirme el consumo. Esta confirmación descuenta inventario y vincula el movimiento a la orden; todavía no genera factura.
5. En CIERRE Y FACTURA revise el diagnóstico, los trabajos, impuestos, repuestos y total estimado. Complete el checklist, registre el usuario que recibe y finalice la orden.
6. Seleccione el medio de pago y genere la factura. El sistema factura una sola vez los trabajos y repuestos cobrables y deja la orden CERRADA.

Las órdenes finalizadas, cerradas o anuladas quedan en modo consulta. La trazabilidad al final del expediente muestra cada cambio de estado, fecha, responsable y nota.

![Pestaña de ingreso](assets/10_ingreso_vehiculos.png)

![Pestaña de diagnóstico](assets/11_diagnostico.png)

![Pestaña de trabajos](assets/12_trabajos_servicios.png)

![Pestaña de repuestos](assets/13_repuestos_insumos.png)

![Pestaña de cierre y factura](assets/14_cierre_entrega.png)

## 9. ALISTAMIENTOS

Registre referencia, sucursal, cliente, ejecutor, VIN, motor, placa, marca, modelo, año y kilometraje. Indique si abre garantía, documente hallazgos, revisiones, observaciones y consumos.

![Alistamiento](assets/08_alistamientos.png)

## 10. GARANTÍAS DEL FABRICANTE

1. Seleccione vehículo, tipo de garantía y punto de detección.
2. Asocie orden, fecha de falla y kilometraje.
3. Registre causa, modo de falla, pieza causante y reemplazos.
4. Registre autorización y radicación.
5. Actualice aprobación o rechazo y valores reconocidos.
6. Registre factura y pago del fabricante.

![Garantías](assets/15b_nueva_garantia.png)

## 11. REPORTES

Seleccione el reporte, rango de fechas y filtros. Genere y revise ventas por sucursal, margen por producto, cotizaciones o historial de búsqueda.

![Reportes](assets/32_reportes.png)

## 12. CONTROLES DIARIOS

- Inicio: confirmar empresa/sucursal, abrir caja, revisar citas, órdenes e inventario bajo.
- Cierre: actualizar órdenes, validar movimientos con soporte, conciliar y cerrar caja, cerrar sesión.
- Ingreso rechazado: revise el mensaje mostrado y valide cliente, VIN, marca/modelo, sucursal, combustible y firma.
- Soporte: informe usuario, empresa, sucursal, fecha/hora, módulo, documento y pasos; nunca adjunte contraseñas.
"""
    MD_PATH.write_text(md, encoding="utf-8")


if __name__ == "__main__":
    MANUAL_DIR.mkdir(parents=True, exist_ok=True)
    build_docx()
    build_markdown()
    print(DOCX_PATH)
    print(MD_PATH)
