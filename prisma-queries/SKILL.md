# Prisma Queries

## Description
Type-safe database query patterns and best practices with Prisma ORM.

## When to use
- Writing database queries
- Optimizing query performance
- Handling relations
- Implementing pagination

## Best Practices

### Query Patterns
- Use select to limit fields
- Use include for relations
- Implement pagination with cursor/take/skip
- Use findUnique for single records

### Performance
- Use indexes for filtering
- Batch operations with createMany/updateMany
- Avoid N+1 queries
- Use raw queries when needed

### Type Safety
- Leverage Prisma Client types
- Use generated input types
- Validate data before queries
- Handle null/undefined properly

## References
- https://www.prisma.io/docs/orm/prisma-client
