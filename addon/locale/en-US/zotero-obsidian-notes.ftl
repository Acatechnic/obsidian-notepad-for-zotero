# Item-pane section header. Provide BOTH a value and a .label attribute: Zotero's
# header label element reads the attribute on some builds, the value on others.
zon-header = Obsidian Note
    .label = Obsidian Note
# Sidenav rail = icon only. Attribute-only message (no plain value) so Fluent
# sets just the hover tooltip and does NOT write the label into the button's
# textContent (which renders as text on top of the icon). Matches how Better
# Notes registers its sidenav buttons.
zon-sidenav =
    .title = Obsidian Note
zon-button-obsidian = Open in Obsidian
zon-button-reload = Reload from disk
