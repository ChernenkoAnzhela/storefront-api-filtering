function generateQuery(collectionHandle, currentCursor, prevCursors, filterOptionListQuery, minPrice, maxPrice) {
  let afterPart = prevCursors.length > 1 ? `, after: \"${currentCursor}\"` : '';
  let filterListOptionQuery = filterOptionListQuery.length > 0 ? filterOptionListQuery : '';
  let filters = `[
     ${filterListOptionQuery}
     { price: { min: ${minPrice}, max: ${maxPrice} } }]`;

  return JSON.stringify({
    query: `{
      collection(handle: "${collectionHandle}") {
        handle
        products(first: 5${afterPart}, filters: ${filters}) {
          filters {
            id
            label
            type
            values {
              id
              label
              count
              input
            }
          }
          edges {
            node {
              handle
              availableForSale
              productType
              vendor
              tags
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
            pageInfo {
              hasNextPage
              hasPreviousPage
              endCursor
              startCursor
            }
          }
        }
      }`
  });
}

export { generateQuery };
