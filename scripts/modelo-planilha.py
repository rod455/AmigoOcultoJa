#!/usr/bin/env python3
"""
Gera os modelos de planilha que a empresa baixa em /empresas/importar:
  public/modelos/amigo-secreto-empresa.xlsx  (aba Participantes vazia, aba Exemplo, aba Como preencher)
  public/modelos/amigo-secreto-empresa.csv   (só o cabeçalho, separador ";" como o Excel em português)

O padrão (colunas Nome e Área) é o mesmo que src/lib/planilha.ts lê. Mudou
uma coluna aqui, mude lá e nos testes (tests/planilha.test.ts).

Uso: pip install openpyxl==3.1.5 && python3 scripts/modelo-planilha.py
"""
import os

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "modelos")
os.makedirs(OUT, exist_ok=True)

AZUL = "1F4BB8"  # submarca Empresas (biz.accent)
HEADER = ["Nome", "Área"]
EXEMPLO = [
    ("Ana Souza", "Financeiro"),
    ("Bruno Lima", "Financeiro"),
    ("Carla Dias", "Financeiro"),
    ("Diego Rocha", "Marketing"),
    ("Elisa Prado", "Marketing"),
    ("Fábio Nunes", "Marketing"),
    ("Gabi Torres", "Marketing"),
]


def cabecalho(ws):
    ws.append(HEADER)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF", size=12)
        c.fill = PatternFill("solid", fgColor=AZUL)
        c.alignment = Alignment(vertical="center")
    ws.row_dimensions[1].height = 24
    ws.column_dimensions["A"].width = 36
    ws.column_dimensions["B"].width = 24
    ws.freeze_panes = "A2"


wb = Workbook()

# 1. a aba que a empresa preenche (vazia, para o exemplo nunca entrar no sorteio por engano)
ws = wb.active
ws.title = "Participantes"
cabecalho(ws)
dv = DataValidation(type="textLength", operator="lessThanOrEqual", formula1="60", allow_blank=True,
                    errorTitle="Nome longo demais", error="Use até 60 letras.")
ws.add_data_validation(dv)
dv.add("A2:B2000")

# 2. exemplo preenchido
ex = wb.create_sheet("Exemplo")
cabecalho(ex)
for row in EXEMPLO:
    ex.append(row)

# 3. instruções
ins = wb.create_sheet("Como preencher")
ins.column_dimensions["A"].width = 100
linhas = [
    ("Amigo secreto da empresa · Amigo Oculto Já!", True),
    ("", False),
    ("1. Preencha a aba Participantes: uma pessoa por linha.", False),
    ("2. Nome (obrigatório): como a pessoa é conhecida no trabalho. Se houver nomes iguais na mesma área, inclua o sobrenome.", False),
    ("3. Área (opcional): o time ou departamento. Cada área vira um grupo de sorteio separado.", False),
    ("    Deixe a coluna Área vazia para sortear todo mundo num grupo só (até 50 pessoas).", False),
    ("4. Áreas com menos de 3 pessoas entram juntas num grupo \"Outras áreas\". Áreas com mais de 50 são divididas.", False),
    ("5. Salve e envie o arquivo em amigoocultoja.com.br/empresas/importar. Antes de criar, você vê a prévia de cada grupo.", False),
    ("", False),
    ("Não coloque e-mail, telefone ou CPF: o sorteio só precisa do nome. Quem participa não cria conta.", False),
    ("Veja a aba Exemplo para um modelo preenchido.", False),
]
for texto, negrito in linhas:
    ins.append([texto])
    c = ins.cell(row=ins.max_row, column=1)
    c.font = Font(bold=negrito, size=14 if negrito else 11, color=AZUL if negrito else "111418")
    c.alignment = Alignment(wrap_text=True, vertical="top")

wb.active = 0
xlsx = os.path.join(OUT, "amigo-secreto-empresa.xlsx")
wb.save(xlsx)

csv = os.path.join(OUT, "amigo-secreto-empresa.csv")
with open(csv, "w", encoding="utf-8-sig", newline="") as f:
    f.write(";".join(HEADER) + "\r\n")

print("modelos:", os.path.relpath(xlsx, ROOT), os.path.relpath(csv, ROOT))
