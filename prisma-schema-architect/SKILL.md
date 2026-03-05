# Prisma Schema Architect

## Description
Design and manage database structures using Prisma Schema Language (PSL).

## When to use
- Designing database schemas
- Creating model relationships
- Planning migrations
- Optimizing database structure

## Best Practices

### Schema Design
- Use meaningful model names
- Define clear relationships
- Add appropriate indexes
- Use proper field types

### Relationships
- One-to-One: @relation with unique
- One-to-Many: implicit or explicit
- Many-to-Many: relation tables
- Self-referential relations

### Migrations
- Review migrations before applying
- Use reset for development
- Handle data migrations separately
- Version control schema changes

## References
- https://www.prisma.io/docs/orm/prisma-schema
