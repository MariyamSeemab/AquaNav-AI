# Contributing to Fish Detection System

First off, thank you for considering contributing to Fish Detection System! 🎉

Following these guidelines helps communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to mnmukadam04@gmail.com.

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Git
- Basic understanding of Flask and geospatial concepts

### Setting Up Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/Fish-Detection-System.git
cd Fish-Detection-System

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies

# Run tests
pytest tests/
```

## 🎯 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title** - Descriptive and specific
- **Steps to reproduce** - Detailed steps to reproduce the behavior
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Screenshots** - If applicable
- **Environment details** - OS, Python version, etc.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear use case** - Why is this enhancement needed?
- **Detailed description** - How should it work?
- **Alternative solutions** - What alternatives have you considered?
- **Additional context** - Screenshots, mockups, etc.

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Simple issues perfect for beginners
- `help wanted` - Issues where we need community help
- `documentation` - Improvements or additions to documentation

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** following our style guidelines
3. **Add tests** if you've added code that should be tested
4. **Update documentation** if you've changed APIs
5. **Ensure tests pass** by running `pytest`
6. **Submit your pull request**

## 📝 Style Guidelines

### Python Code Style

We follow PEP 8 with some modifications:

```python
# Good
def calculate_distance(lat1: float, lon1: float, 
                      lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates.
    
    Args:
        lat1: Latitude of first point
        lon1: Longitude of first point
        lat2: Latitude of second point
        lon2: Longitude of second point
    
    Returns:
        Distance in kilometers
    """
    # Implementation
    pass

# Bad
def calc_dist(a,b,c,d):
    # No docstring
    pass
```

**Key Points:**
- Use descriptive variable names
- Add type hints
- Write docstrings for all functions
- Maximum line length: 88 characters (Black default)
- Use f-strings for formatting

### JavaScript Code Style

Follow Airbnb JavaScript Style Guide:

```javascript
// Good
const calculateDistance = (point1, point2) => {
  const { lat: lat1, lon: lon1 } = point1;
  const { lat: lat2, lon: lon2 } = point2;
  return Math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2);
};

// Bad
function calcDist(p1,p2){
  return Math.sqrt((p2.lat-p1.lat)**2+(p2.lon-p1.lon)**2)
}
```

### Documentation Style

- Use Markdown for all documentation
- Include code examples where applicable
- Keep language clear and concise
- Add diagrams for complex concepts

## 📦 Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(api): add pagination to fish recommendations

Added limit and offset parameters to the /recommend endpoint
to support pagination for large result sets.

Closes #123
```

```
fix(routing): resolve infinite loop in graph construction

The graph builder was getting stuck when encountering
disconnected water bodies. Added connectivity check.

Fixes #456
```

## 🔄 Pull Request Process

1. **Update documentation** for any new or changed functionality
2. **Add tests** that prove your fix is effective or feature works
3. **Update the README.md** if needed
4. **Follow the style guidelines** for code formatting
5. **Rebase your branch** on latest main before submitting
6. **Write a good PR description** explaining what and why

### PR Checklist

Before submitting, ensure:

- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for hard-to-understand areas
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated and passing
- [ ] Dependent changes merged and published

### Review Process

1. Maintainers will review your PR
2. Changes may be requested
3. Update your PR based on feedback
4. Once approved, a maintainer will merge

## 🏆 Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Invited to join our contributors team

## 📞 Questions?

Feel free to reach out:
- Create an issue
- Email: mnmukadam04@gmail.com
- GitHub Discussions

Thank you for contributing! 🙏
