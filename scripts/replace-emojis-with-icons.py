# -*- coding: utf-8 -*-
"""Replace emoji icons with app-icon markup in Angular templates."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "app"

REPLACEMENTS: list[tuple[str, str]] = [
    ("📅", '<app-icon name="calendar_month" [size]="22" />'),
    ("📋", '<app-icon name="assignment" [size]="22" />'),
    ("🏸", '<app-icon name="sports_tennis" [size]="22" />'),
    ("💰", '<app-icon name="payments" [size]="22" />'),
    ("🟢", '<app-icon name="circle" [size]="22" [filled]="true" />'),
    ("⭐", '<app-icon name="star" [size]="18" [filled]="true" />'),
    ("←", '<app-icon name="arrow_back" [size]="18" />'),
    ("🕐", '<app-icon name="schedule" [size]="22" />'),
    ("🕒", '<app-icon name="schedule" [size]="16" />'),
    ("✅", '<app-icon name="check_circle" [size]="22" />'),
    ("❌", '<app-icon name="cancel" [size]="22" />'),
    ("⚠️", '<app-icon name="warning" [size]="22" />'),
    ("💳", '<app-icon name="credit_card" [size]="22" />'),
    ("🔥", '<app-icon name="local_fire_department" [size]="18" />'),
    ("◀", '<app-icon name="chevron_left" [size]="20" />'),
    ("▶", '<app-icon name="chevron_right" [size]="20" />'),
    ("▶️", '<app-icon name="play_arrow" [size]="18" />'),
    ("✏️", '<app-icon name="edit" [size]="18" />'),
    ("🗑️", '<app-icon name="delete" [size]="18" />'),
    ("➕", '<app-icon name="add" [size]="18" />'),
    ("🏟️", '<app-icon name="stadium" [size]="22" />'),
    ("✉️", '<app-icon name="mail" [size]="18" />'),
    ("⏱️", '<app-icon name="schedule" [size]="18" />'),
    ("⏱", '<app-icon name="schedule" [size]="18" />'),
    ("🛡️", '<app-icon name="admin_panel_settings" [size]="18" />'),
    ("👤", '<app-icon name="person" [size]="18" />'),
    ("👥", '<app-icon name="groups" [size]="22" />'),
    ("👁️", '<app-icon name="visibility" [size]="18" />'),
    ("⏸️", '<app-icon name="pause_circle" [size]="18" />'),
    ("ℹ️", '<app-icon name="info" [size]="22" />'),
    ("✓", '<app-icon name="check" [size]="18" />'),
    ("🥤", '<app-icon name="local_cafe" [size]="22" />'),
    ("🎁", '<app-icon name="redeem" [size]="22" />'),
    ("📈", '<app-icon name="trending_up" [size]="22" />'),
    ("🔑", '<app-icon name="key" [size]="22" />'),
    ("⚡", '<app-icon name="bolt" [size]="22" />'),
    ("📊", '<app-icon name="analytics" [size]="22" />'),
    ("✕", '<app-icon name="close" [size]="20" />'),
    ("🔍", '<app-icon name="search" [size]="18" />'),
    ("📭", '<app-icon name="inbox" [size]="28" />'),
    ("⏳", '<app-icon name="hourglass_top" [size]="28" />'),
    ("📥", '<app-icon name="download" [size]="18" />'),
    ("💵", '<app-icon name="payments" [size]="18" />'),
    ("🙈", '<app-icon name="visibility_off" [size]="18" />'),
    ("⏰", '<app-icon name="schedule" [size]="22" />'),
    ("🧾", '<app-icon name="receipt_long" [size]="22" />'),
    ("🖨️", '<app-icon name="print" [size]="18" />'),
    ("⚙️", '<app-icon name="settings" [size]="22" />'),
    ("🏦", '<app-icon name="account_balance" [size]="22" />'),
    ("📱", '<app-icon name="qr_code_2" [size]="22" />'),
    ("🔄", '<app-icon name="refresh" [size]="18" />'),
]

STAT_CARD_ICONS = {
    '🟢': 'circle',
    '📋': 'assignment',
    '🏸': 'sports_tennis',
    '💰': 'payments',
    '🥤': 'local_cafe',
    '📊': 'analytics',
    '⭐': 'star',
}

HTML_FILES = list(ROOT.rglob("*.html"))
TS_INLINE = [
    ROOT / "app.component.ts",
    ROOT / "layout" / "sidebar" / "sidebar.component.ts",
    ROOT / "layout" / "topbar" / "topbar.component.ts",
    ROOT / "shared" / "components" / "stat-card" / "stat-card.component.ts",
    ROOT / "shared" / "components" / "empty-state" / "empty-state.component.ts",
    ROOT / "shared" / "components" / "error-state" / "error-state.component.ts",
    ROOT / "shared" / "components" / "confirm-dialog" / "confirm-dialog.component.ts",
]

SIDEBAR_ICONS = {
    '📅': 'calendar_month',
    '🏸': 'sports_tennis',
    '💳': 'credit_card',
    '👥': 'groups',
    '🏟️': 'stadium',
    '💰': 'payments',
    '🥤': 'local_cafe',
    '🎁': 'redeem',
    '📈': 'trending_up',
    '📋': 'assignment',
    '🔑': 'key',
}


def replace_in_text(text: str) -> str:
    for old, name in STAT_CARD_ICONS.items():
        text = text.replace(f'icon="{old}"', f'icon="{name}"')
    for old, new in sorted(REPLACEMENTS, key=lambda item: len(item[0]), reverse=True):
        text = text.replace(old, new)
    return text


def patch_sidebar_ts(text: str) -> str:
    for old, name in SIDEBAR_ICONS.items():
        text = text.replace(f"icon: '{old}'", f"icon: '{name}'")
    text = text.replace("title: '⚡ QUẢN TRỊ VIÊN'", "title: 'QUẢN TRỊ VIÊN'")
    return text


def ensure_app_icon_import_ts(text: str, rel: str) -> str:
    if "AppIconComponent" in text:
        return text
    import_line = f"import {{ AppIconComponent }} from '{rel}';\n"
    if "imports: [" in text:
        text = import_line + text
        text = text.replace("imports: [", "imports: [AppIconComponent, ", 1)
    return text


def rel_import(path: Path) -> str:
    import os
    icon_dir = ROOT / "shared" / "components" / "app-icon"
    rel = os.path.relpath(icon_dir, path.parent).replace("\\", "/")
    return f"{rel}/app-icon.component"


def main() -> None:
    for path in HTML_FILES:
        original = path.read_text(encoding="utf-8")
        updated = replace_in_text(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            print(f"updated {path.relative_to(ROOT.parents[1])}")

    sidebar = ROOT / "layout" / "sidebar" / "sidebar.component.ts"
    s_text = patch_sidebar_ts(sidebar.read_text(encoding="utf-8"))
    s_text = s_text.replace(
        '<span class="nav-icon" [innerHTML]="item.icon"></span>',
        '<span class="nav-icon"><app-icon [name]="item.icon" [size]="22" /></span>'
    )
    s_text = ensure_app_icon_import_ts(s_text, rel_import(sidebar))
    sidebar.write_text(s_text, encoding="utf-8")
    print("updated sidebar")

    for path in TS_INLINE:
        text = replace_in_text(path.read_text(encoding="utf-8"))
        text = ensure_app_icon_import_ts(text, rel_import(path))
        path.write_text(text, encoding="utf-8")
        print(f"updated {path.name}")

    component_ts = [p for p in ROOT.rglob("*.component.ts") if "app-icon" not in str(p)]
    for path in component_ts:
        html = path.with_suffix(".html")
        if not html.exists():
            continue
        if "<app-icon" not in html.read_text(encoding="utf-8"):
            continue
        text = path.read_text(encoding="utf-8")
        patched = ensure_app_icon_import_ts(text, rel_import(path))
        if patched != text:
            path.write_text(patched, encoding="utf-8")
            print(f"import {path.relative_to(ROOT.parents[1])}")


if __name__ == "__main__":
    main()
