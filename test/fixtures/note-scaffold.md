---
citekey: "{{citekey}}"
Title: "{{title}}"
Year: "{{date | format("YYYY")}}"
Author:
{% for c in creators %} - "[[{{c.firstName}} {{c.lastName}}]]"
{% endfor %}
Journal: "[[J. {{publicationTitle}} ]]"
Tags:
  - Reference
  - {{itemType}}
Topics:
{% if allTags %}
{% for tag in allTags.split(", ") %}
- "[[{{tag}}]]"
{% endfor %}
{% endif %}
ZoteroLink: "{{desktopURI}}"
KeyIdea:
---

**Citation:** {{bibliography}}

**Abstract:** {%- if abstractNote %} {{abstractNote}} {% endif %}

## Notes


## Annotations
%% zon kind=annotations colour=all sync=on format=list %%
%% /zon %%
