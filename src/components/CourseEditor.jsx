export default function CourseEditor({ course, onParChange, onHcpChange }) {
  return (
    <div>
      <h3>Course</h3>
      {course.pars.map((par, i) => (
        <div key={i}>
          Hole {i + 1}{" "}
          <label>
            Par:
            <input
              type="number"
              value={course.pars[i]}
              onChange={(e) => onParChange(i, e.target.value)}
            />
          </label>{" "}
          <label>
            HCP:
            <input
              type="number"
              value={course.hcp[i]}
              onChange={(e) => onHcpChange(i, e.target.value)}
            />
          </label>
        </div>
      ))}
    </div>
  );
}