import { generateQuery } from './query.js';
class filterComponent extends HTMLElement {
  constructor() {
    super();
    this.currentCursor;
    this.hasNextPage;
    this.hasPrevPage;
    this.prevCursors = [];
    this.prevButton = this.querySelector('#prev-button');
    this.nextButton = this.querySelector('#next-button');
    this.mainCollectionGrid = this.querySelector('.main-collection-grid-wrapper');
    this.filterOptionPrice = this.querySelectorAll('.js-filter-price input');
    this.filterOptionList = this.querySelectorAll('input[data-filter-type]');
    this.filterOptionQuery = '';
    this.detailsElements =  this.querySelectorAll('details');
    this.parts = window.location.pathname.split('/').filter(part => part.length > 0);
    this.collectionHandle = this.parts.length > 0 ? this.parts.pop() : 'hydrogen';

    this.getSelectOption = this.getSelectOption.bind(this);
    this.getSelectOptionList = this.getSelectOptionList.bind(this);
    this.fetchFilteredProducts = this.fetchFilteredProducts.bind(this);
    this.updateProductList = this.updateProductList.bind(this);

    this.nextButton.addEventListener('click', () => this.goNext());
    this.prevButton.addEventListener('click', () => this.goPrev());

    this.filterOptionPrice.forEach(el => el.addEventListener("input", this.getSelectOption));
    this.filterOptionList.forEach(el => el.addEventListener("input", this.getSelectOptionList));

    this.detailsToggle = this.detailsToggle.bind(this);

    this.detailsElements.forEach(details => {
      details.addEventListener("toggle", (event) => this.detailsToggle(event.target));
    });
  }
  
  async fetchFilteredProducts (filterOptionListQuery, minPrice, maxPrice) {
    let query = generateQuery(this.collectionHandle, this.currentCursor, this.prevCursors, filterOptionListQuery, minPrice, maxPrice);

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
        this.hasNextPage = pageInfo.hasNextPage;
        this.hasPrevPage = pageInfo.hasPreviousPage;
        this.currentCursor = pageInfo.endCursor ? pageInfo.endCursor : null;

        if (this.hasNextPage) {
          this.prevCursors.push(pageInfo.startCursor);
          this.prevCursors.push(this.currentCursor);
        }

        this.prevCursors = Array.from(new Set(this.prevCursors))

        this.prevButton.style.display = this.hasPrevPage ? 'block' : 'none';
        this.nextButton.style.display = this.hasNextPage ? 'block' : 'none';

        return data.data.collection.products.edges.map(edge => edge.node);
      })
      .catch(error => {
        console.error('Error:', error);
        return [];
      });
  }

  async updateProductList (filterOptionListQuery, minPrice, maxPrice) {
    try {
      const products = await this.fetchFilteredProducts (filterOptionListQuery, minPrice, maxPrice);
      let productListHandle = '';

      products.forEach(el => {
        productListHandle += `${el.handle}+`;
      });

      productListHandle = productListHandle.slice(0, -1);

      const response = await fetch(`/collections/${this.collectionHandle}/search?q=${productListHandle}&section_id=collection-grid`);
      const responseText = await response.text();
      const html = new DOMParser().parseFromString(responseText, 'text/html');
      const sourceQty = html.querySelector('.main-collection-grid-wrapper');

      this.mainCollectionGrid.innerHTML = sourceQty.innerHTML;
    } catch (error) {
      console.error('Error updating product list:', error);
    }
  }

  goNext () {
    let minPrice = parseInt(this.filterOptionPrice[0].value).toFixed(2) || 0;
    let maxPrice = parseInt(this.filterOptionPrice[1].value).toFixed(2) || 1000;

    if (this.hasNextPage) this.updateProductList(this.filterOptionQuery, minPrice, maxPrice);
  }

  goPrev () {
    let minPrice = parseInt(this.filterOptionPrice[0].value).toFixed(2) || 0;
    let maxPrice = parseInt(this.filterOptionPrice[1].value).toFixed(2) || 1000;

    if (this.hasPrevPage) {
      this.prevCursors.pop();
      this.currentCursor = this.prevCursors.length > 0 ? this.prevCursors[this.prevCursors.length - 2] : null;
      this.updateProductList (this.filterOptionQuery, minPrice, maxPrice);
    }
  }

  getSelectOption (e) {
    let paginationControls = document.querySelector('.js-pagination-controls');
    let defaultPagination = document.querySelector('.js-default-pagination');

    defaultPagination.style.display = 'none';
    paginationControls.style.display = 'flex';

    this.prevCursors = [];
    this.currentCursor = null;

    let minPrice = parseInt(this.filterOptionPrice[0].value).toFixed(2) || 0;
    let maxPrice = parseInt(this.filterOptionPrice[1].value).toFixed(2) || 1000;

    if (maxPrice - minPrice >= 250 && maxPrice <= this.filterOptionPrice[1].max) {
      if (e.target.className === "filter-price__min") {
        this.filterOptionPrice[0].value = minPrice;
      } else {
        this.filterOptionPrice[1].value = maxPrice;
      }
    }

   this.updateProductList (this.filterOptionQuery, minPrice,maxPrice);
  }

  getSelectOptionList (e) {
    let paginationControls = document.querySelector('.js-pagination-controls');
    let defaultPagination = document.querySelector('.js-default-pagination');
    let checkedValues = [];

    defaultPagination.style.display = 'none';
    paginationControls.style.display = 'flex';

    this.prevCursors = [];
    this.currentCursor = null;

    this.filterOptionList.forEach(function(input) {
      if (input.checked) {
        checkedValues.push(input);
      }
    });

    this.filterOptionQuery = '';

    if (checkedValues.length > 0) {
      checkedValues.forEach(option => {
        let filterListOptionLabel = option.getAttribute('data-filter-type');
        if (filterListOptionLabel === 'available' ) {
          this.filterOptionQuery += `{ ${filterListOptionLabel}: ${option.value} },`
        } else {
          this.filterOptionQuery += `{ ${filterListOptionLabel}: "${option.value}" },`
        }
      })
    }

    this.updateProductList (this.filterOptionQuery, this.filterOptionPrice[0].value, this.filterOptionPrice[1].value);
  }

  detailsToggle(openedDetails) {
    if (openedDetails.open) {
      this.detailsElements.forEach((details) => {
        if (details !== openedDetails && details.open) {
          details.open = false;
        }
      });
    }
  }
}

customElements.define('filter-component', filterComponent);
