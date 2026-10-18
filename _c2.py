def ghost_states_sheet():
    out = []
    for name, body, alpha in [
        ("idle", "#a98aff", 1.0),
        ("stunned", "#51dcff", 0.45),
        ("dead", "#3f2a4a", 0.2),
        ("bow", "#ff9b50", 0.7),
    ]:
        out.append(
            '<g class="state-' + name + '">'
            + "<ellipse cx=0 cy=0 rx=30 ry=40 fill=" + body + " opacity=" + str(alpha) + " />"
            + "<ellipse cx=0 cy=-6 rx=11 ry=14 fill=#f7fbff />"
            + "<ellipse cx=0 cy=-6 rx=11 ry=14 fill=#f7fbff />"
            + "<circle cx=-8 cy=-8 r=3 fill=#172a50 />"
            + "<circle cx=8 cy=-8 r=3 fill=#172a50 />"
            + '<animateTransform attributeName=transform type=translate from="0 0" to="0 -6" dur=1.7s repeatCount=indefinite/>'
            + "</g>"
        )
    return "\n".join(out)


def ghost_actions_sheet():
    out = []
    for i in range(6):
        ang = i * 60
        out.append(
            "<g class=\"action-chase-" + str(i).zfill(2) + "\">"
            + "<ellipse cx=0 cy=0 rx=28 ry=34 fill=#a98aff filter=url(#soft-glow) />"
            + "<path d=\"M -14 10 V -5 C -14 -14 14 -14 14 10 V 10 L 14 4 L 0 10 L -14 4 Z\" fill=#a98aff />"
            + "<ellipse cx=-7 cy=-2 rx=4 ry=5 fill=#172a50 />"
            + "<ellipse cx=7 cy=-2 rx=4 ry=5 fill=#172a50 />"
            + '<animateTransform attributeName=transform type=rotate from="' + str(ang - 30) + " 0 0\" to=\"" + str(ang + 30) + " 0 0\" dur=1.4s repeatCount=indefinite/>"
            + "</g>"
        )
    return "\n".join(out)


def ghost_types_sheet():
    colors = [
        ("red", "#ff5876", "#ff9b50"),
        ("cyan", "#35d7ea", "#12d8e7"),
        ("pink", "#ff70b5", "#ff9b50"),
        ("orange", "#ff9b50", "#ff70b5"),
    ]
    out = []
    for name, body, edge in colors:
        out.append(
            '<g class="type-' + name + '">'
            + "<ellipse cx=0 cy=0 rx=30 ry=40 fill=" + body + " stroke=" + edge + " stroke-width=3 />"
            + "<ellipse cx=0 cy=-2 rx=28 ry=38 fill=" + body + " opacity=0.2 />"
            + "</g>"
        )
    return "\n".join(out)


def powerup_states_sheet():
    out = []
    for i, (name, body, ring, glow) in enumerate(
        [
            ("pill", "#ffd84d", "#ff9b50", "#ffd84d"),
            ("orb", "#35d7ea", "#5be4c2", "#35d7ea"),
            ("core", "#ff71bd", "#ff9b50", "#ff71bd"),
            ("key", "#61e5b2", "#12b886", "#61e5b2"),
        ]
    ):
        out.append(
            '<g class="state-' + name + '">'
            + "<circle cx=0 cy=-6 r=44 fill=" + glow + " opacity=0.35 filter=url(#soft-glow) />"
            + "<circle cx=0 cy=-6 r=30 fill=" + ring + " opacity=0.5 />"
            + "<circle cx=0 cy=-6 r=26 fill=" + body + " />"
            + "<circle cx=0 cy=-6 r=5 fill=#08111f />"
            + '<animateTransform attributeName=transform type=scale from="1 1" to="1.06 1.06" dur=1.6s repeatCount=indefinite/>'
            + "</g>"
        )
    return "\n".join(out)


def powerup_actions_sheet():
    out = []
    for i in range(4):
        out.append(
            "<g class=\"action-eat-" + str(i).zfill(2) + "\">"
            + "<circle cx=0 cy=0 r=40 fill=#35d7ea />"
            + "<circle cx=0 cy=-4 r=34 fill=#35d7ea opacity=0.35 />"
            + "<circle cx=0 cy=-4 r=30 fill=#12d8e7 />"
            + "<circle cx=0 cy=-4 r=6 fill=#08111f />"
            + "<path d=\"M -10 6 Q 0 2 10 6\" stroke=#08111f stroke-width=3 fill=none/>"
            + '<animateTransform attributeName=transform type=scale from="1 1" to="1.08 1.08" dur=1.1s repeatCount=indefinite/>'
            + "</g>"
        )
    return "\n".join(out)


def powerup_types_sheet():
    out = []
    for name, body, glow in [
        ("dot", "#d7e9ff", "#5be4c2"),
        ("big", "#ffd84d", "#ff9b50"),
        ("energized", "#ff9b50", "#ffd84d"),
        ("fruit", "#ff70b5", "#ff9b50"),
    ]:
        out.append(
            '<g class="type-' + name + '">'
            + "<circle cx=0 cy=0 r=48 fill=" + glow + " opacity=0.4 filter=url(#soft-glow) />"
            + "<circle cx=0 cy=0 r=38 fill=" + body + " />"
            + "<circle cx=0 cy=0 r=30 fill=" + body + " opacity=0.25 />"
            + "</g>"
        )
    return "\n".join(out)


def maze_states_sheet():
    out = []
    for i in range(4):
        out.append(
            "<g class=\"state-maze-" + str(i).zfill(2) + "\">"
            + "<rect x=-34 y=-34 width=68 height=68 rx=8 fill=#0b1b30 stroke=#268fff stroke-width=4 />"
            + "<rect x=-32 y=-32 width=64 height=64 rx=6 fill=#08182e />"
            + "<rect x=-6 y=-6 width=12 height=60 rx=2 fill=#1c3045 />"
            + "<rect x=-6 y=-6 width=60 height=12 rx=2 fill=#1c3045 />"
            + '<animateTransform attributeName=transform type=translate from="0 0" to="0 -2" dur=0.9s repeatCount=indefinite/>'
            + "</g>"
        )
    return "\n".join(out)


def maze_actions_sheet():
    out = []
    for i in range(6):
        out.append(
            "<g class=\"action-maze-" + str(i).zfill(2) + "\">"
            + "<rect x=-30 y=-30 width=60 height=60 rx=6 fill=#0c1726 stroke=#22324f stroke-width=2 />"
            + "<rect x=-22 y=-22 width=44 height=44 rx=4 fill=#0e2034 />"
            + "<circle cx=0 cy=0 r=5 fill=#d8eaff />"
            + '<animateTransform attributeName=transform type=translate from="0 0" to="0 3" dur=1.2s repeatCount=indefinite/>'
            + "</g>"
        )
    return "\n".join(out)


def maze_types_sheet():
    out = []
    for name, fill, stroke in [
        ("wall", "#0b1b30", "#268fff"),
        ("path", "#08182e", "#1c3045"),
        ("pellet", "#d8eaff", "#5be4c2"),
        ("big", "#ffd84d", "#ff9b50"),
        ("gate", "#26d9ee", "#08111f"),
        ("spawn", "#1d1533", "#c18bff"),
    ]:
        out.append(
            '<g class="type-' + name + '">'
            + "<rect x=-34 y=-34 width=68 height=68 rx=10 fill=" + fill + " stroke=" + stroke + " stroke-width=4 />"
            + "</g>"
        )
    return "\n".join(out)
