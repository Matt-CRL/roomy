export const categoryGroups = [
  {
    label: 'Furniture & decor',
    categories: ['Furniture', 'Bedding', 'Decor'],
  },
  {
    label: 'Electronics',
    categories: ['Electronics', 'Cables'],
  },
  {
    label: 'Clothing & personal',
    categories: ['Clothing', 'Personal items', 'Toiletries', 'Towels', 'Personal care'],
  },
  {
    label: 'Kitchen',
    categories: ['Appliances', 'Cookware', 'Dinnerware', 'Utensils', 'Food storage'],
  },
  {
    label: 'Books & documents',
    categories: ['Books & media', 'Documents'],
  },
  {
    label: 'Storage & household',
    categories: ['Storage', 'Bathroom storage', 'Cleaning supplies', 'Tools', 'Miscellaneous'],
  },
]

export const categories = categoryGroups.flatMap((group) => group.categories)
