let currentCursor = null;
let hasNextPage = false;
let hasPrevPage = false;
let prevCursors = [];
let prevButton = document.getElementById('prev-button');
let nextButton = document.getElementById('next-button');
let mainCollectionGrid = document.querySelector('.main-collection-grid-wrapper');
const parts = window.location.pathname.split('/').filter(part => part.length > 0);
const collectionHandle = parts.length > 0 ? parts.pop() : 'hydrogen';
let filterOptionPrice = document.querySelectorAll('.js-filter-price input');
let filterOptionList = document.querySelectorAll('input[data-filter-type]');
let filterOptionQuery = '';

async function fetchFilteredProducts (filterOptionListQuery, minPrice, maxPrice) {
  let afterPart = prevCursors.length > 1 ? `, after: \"${currentCursor}\"` : '';
  let filterListOptionQuery = filterOptionListQuery.length > 0 ? filterOptionListQuery : '';
  let filters = `[
  ${filterListOptionQuery}
  { price: { min: ${minPrice}, max: ${maxPrice} } }]`;

  let query = JSON.stringify({
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

  const url = "/api/2021-01/graphql";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": "1048a410c509db2baeca0a95b487efb8",
    },
    body: query,
  };

  return fetch(url, options)
    .then(response => response.json())
    .then(data => {
      const pageInfo = data.data.collection.products.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      hasPrevPage = pageInfo.hasPreviousPage;
      currentCursor = pageInfo.endCursor ? pageInfo.endCursor : null;

      if (hasNextPage) {
        prevCursors.push(pageInfo.startCursor);
        prevCursors.push(currentCursor);
      }

      prevCursors = Array.from(new Set(prevCursors))

      prevButton.style.display = hasPrevPage ? 'block' : 'none';
      nextButton.style.display = hasNextPage ? 'block' : 'none';

      return data.data.collection.products.edges.map(edge => edge.node);
    })
    .catch(error => {
      console.error('Error:', error);
      return [];
    });
}

async function updateProductList (filterOptionListQuery, minPrice, maxPrice) {
  try {
    const products = await fetchFilteredProducts (filterOptionListQuery, minPrice, maxPrice);
    let productListHandle = '';

    products.forEach(el => {
      productListHandle += `${el.handle}+`;
    });

    productListHandle = productListHandle.slice(0, -1);

    fetch(`/search?q=${productListHandle}&section_id=collection-grid`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const sourceQty = html.querySelector('.main-collection-grid-wrapper');
        mainCollectionGrid.innerHTML = sourceQty.innerHTML;
      })
      .catch((e) => {
        console.error(e);
      });
  } catch (error) {
    console.error('Error updating product list:', error);
  }
}

nextButton.addEventListener('click', () => {
  let minPrice = parseInt(filterOptionPrice[0].value) || 0;
  let maxPrice = parseInt(filterOptionPrice[1].value) || 1000;

  if (hasNextPage) updateProductList(filterOptionQuery, minPrice, maxPrice);
});

prevButton.addEventListener('click', () => {
  let minPrice = parseInt(filterOptionPrice[0].value) || 0;
  let maxPrice = parseInt(filterOptionPrice[1].value) || 1000;
  if (hasPrevPage) {
    prevCursors.pop();
    currentCursor = prevCursors.length > 0 ? prevCursors[prevCursors.length - 2] : null;

    updateProductList (filterOptionQuery, minPrice, maxPrice);
  }
});

function getSelectOption (e) {
  let paginationControls = document.querySelector('.js-pagination-controls');
  let defaultPagination = document.querySelector('.js-default-pagination');

  defaultPagination.style.display = 'none';
  paginationControls.style.display = 'flex';

  prevCursors = [];
  currentCursor = null;

  let minPrice = parseInt(filterOptionPrice[0].value) || 0;
  let maxPrice = parseInt(filterOptionPrice[1].value) || 1000;

  if (maxPrice - minPrice >= 250 && maxPrice <= filterOptionPrice[1].max) {
    if (e.target.className === "filter-price__min") {
      filterOptionPrice[0].value = minPrice;
    } else {
      filterOptionPrice[1].value = maxPrice;
    }
  }

  updateProductList (filterOptionQuery, minPrice,maxPrice);
}

function getSelectOptionList (e) {
  let paginationControls = document.querySelector('.js-pagination-controls');
  let defaultPagination = document.querySelector('.js-default-pagination');
  let checkedValues = [];

  defaultPagination.style.display = 'none';
  paginationControls.style.display = 'flex';

  prevCursors = [];
  currentCursor = null;

  filterOptionList.forEach(function(input) {
    if (input.checked) {
      checkedValues.push(input);
    }
  });

  filterOptionQuery = '';

  if (checkedValues.length > 0) {
    checkedValues.forEach(option => {
      let filterListOptionLabel = option.getAttribute('data-filter-type');
      if (filterListOptionLabel === 'available' ) {
        filterOptionQuery += `{ ${filterListOptionLabel}: ${option.value} },`
      } else {
        filterOptionQuery += `{ ${filterListOptionLabel}: "${option.value}" },`
      }
    })
  }

  updateProductList (filterOptionQuery, filterOptionPrice[0].value, filterOptionPrice[1].value);
}

document.addEventListener('DOMContentLoaded', () => {
  filterOptionPrice.forEach(el => el.addEventListener("input", getSelectOption));
  filterOptionList.forEach(el => el.addEventListener("input", getSelectOptionList));
});
