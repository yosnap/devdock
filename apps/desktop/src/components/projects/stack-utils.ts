/** Map stack identifier to Ant Design tag color */
export function stackColor(stack: string): string {
  const colors: Record<string, string> = {
    node: 'green',
    rust: 'volcano',
    python: 'blue',
    go: 'cyan',
    java: 'orange',
    swift: 'geekblue',
    php: 'purple',
    ruby: 'red',
    dotnet: 'magenta',
  };
  return colors[stack] ?? 'default';
}

/** Map stack identifier to display label */
export function stackLabel(stack: string): string {
  const labels: Record<string, string> = {
    node: 'Node.js',
    rust: 'Rust',
    python: 'Python',
    go: 'Go',
    java: 'Java/Kotlin',
    swift: 'Swift',
    php: 'PHP',
    ruby: 'Ruby',
    dotnet: '.NET',
  };
  return labels[stack] ?? stack;
}
