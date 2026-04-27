export default function CourseEditor({ course, onParChange, onHcpChange }) {
  function focusField(id) {
    setTimeout(() => {
      const input = document.getElementById(id);
      if (input) {
        input.focus();
        input.select?.();
      }
    }, 0);
  }

  function handleParInput(index, rawValue) {
    const cleaned = rawValue.replace(/\D/g, "").slice(0, 1);

    if (cleaned === "") {
      onParChange(index, "");
      return;
    }

    onParChange(index, cleaned);
    focusField(`course-hcp-${index}`);
  }

  function handleHcpInput(index, rawValue) {
    const cleaned = rawValue.replace(/\D/g, "").slice(0, 2);

    if (cleaned === "") {
      onHcpChange(index, "");
      return;
    }

    const numberValue = Number(cleaned);

    if (numberValue > 18) return;

    onHcpChange(index, cleaned);

    if (cleaned.length === 2 || numberValue === 0) {
      focusField(`course-par-${index + 1}`);
    }
  }

  return (
    <div>
      <h3>Course</h3>

      {course.pars.map((par, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 6,
          }}
        >
          <strong style={{ minWidth: 55 }}>Hole {i + 1}</strong>

          <label>
            Par:
            <input
              id={`course-par-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={course.pars[i] ?? ""}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleParInput(i, e.target.value)}
              style={{ width: 60, marginLeft: 6, fontSize: 16, padding: 6 }}
            />
          </label>

          <label>
            HCP:
            <input
              id={`course-hcp-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={course.hcp[i] ?? ""}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleHcpInput(i, e.target.value)}
              style={{ width: 60, marginLeft: 6, fontSize: 16, padding: 6 }}
            />
          </label>
        </div>
      ))}
    </div>
  );
}