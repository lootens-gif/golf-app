export default function CourseEditor({ course, onParChange, onHcpChange }) {
  function handleParInput(index, rawValue) {
    const cleaned = rawValue.replace(/\D/g, "").slice(0, 1);
    onParChange(index, cleaned);
  }

  function handleHcpInput(index, rawValue) {
    const cleaned = rawValue.replace(/\D/g, "").slice(0, 2);
    onHcpChange(index, cleaned);
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
              type="text"
              inputMode="numeric"
              value={course.pars[i] ?? ""}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleParInput(i, e.target.value)}
              style={{ width: 60, marginLeft: 6, fontSize: 16, padding: 6 }}
            />
          </label>

          <label>
            HCP:
            <input
              type="text"
              inputMode="numeric"
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