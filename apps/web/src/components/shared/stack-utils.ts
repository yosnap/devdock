/// Stack color and label mappings — shared across project card and filters.
export function stackColor(stack: string): string {
  const colors: Record<string, string> = {
    node: 'green', rust: 'volcano', python: 'blue', go: 'cyan',
    java: 'orange', swift: 'geekblue', php: 'purple', ruby: 'red', dotnet: 'magenta',
  };
  return colors[stack] ?? 'default';
}

export function stackLabel(stack: string): string {
  const labels: Record<string, string> = {
    node: 'Node.js', rust: 'Rust', python: 'Python', go: 'Go',
    java: 'Java/Kotlin', swift: 'Swift', php: 'PHP', ruby: 'Ruby', dotnet: '.NET',
  };
  return labels[stack] ?? stack;
}

export const STACK_OPTIONS = [
  { value: 'node', label: 'Node.js' },
  { value: 'rust', label: 'Rust' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java/Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'dotnet', label: '.NET' },
];
