def write_sheet(folder, rel, content):
    (folder / rel + ".svg").write_text(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 960 480\" role=\"img\" aria-label=\"" + rel + "\">"
        + "<defs>"
        + "<linearGradient id=bg x1=0 y1=0 x2=1 y2=1>"
        + "<stop stop-color=#101a31/><stop offset=1 stop-color=#080d19/>"
        + "</linearGradient><filter id=soft-glow x=-80% y=-80% width=260% height=260%>"
        + "<feGaussianBlur stdDeviation=4 result=blur/>"
        + "<feMerge><feMergeNode in=blur/><feMergeNode in=SourceGraphic/></feMerge>"
        + "</filter></defs>"
        + "<rect width=960 height=480 rx=24 fill=url(#bg)/>"
        + "<g>" + content + "</g>"
        + "</svg>",
        encoding="utf-8",
    )


def main():
    BUILD.mkdir(parents=True, exist_ok=True)
    (OUT / "character").mkdir(parents=True, exist_ok=True)
    for entity in ["pacman", "ghost", "power-up", "maze"]:
        base = OUT / "character" / entity
        for sub in ["states", "actions", "types"]:
            (base / sub).mkdir(parents=True, exist_ok=True)

    sheets = [
        ("pacman/states", pacman_states_sheet()),
        ("pacman/actions", pacman_actions_sheet()),
        ("pacman/types", pacman_types_sheet()),
        ("ghost/states", ghost_states_sheet()),
        ("ghost/actions", ghost_actions_sheet()),
        ("ghost/types", ghost_types_sheet()),
        ("power-up/states", powerup_states_sheet()),
        ("power-up/actions", powerup_actions_sheet()),
        ("power-up/types", powerup_types_sheet()),
        ("maze/states", maze_states_sheet()),
        ("maze/actions", maze_actions_sheet()),
        ("maze/types", maze_types_sheet()),
    ]

    for rel, content in sheets:
        write_sheet(OUT / "character", rel, content)
        print("wrote " + str(OUT / "character" / rel + ".svg"), flush=True)

    manifest = {
        "version": "1.0.0",
        "folders": [str(p.relative_to(OUT)) for p in sorted((OUT / "character").rglob("*.svg"))],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("wrote " + str(OUT / "manifest.json"))


if __name__ == "__main__":
    main()
