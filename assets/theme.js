class SliderComponent extends HTMLElement {
    constructor() {
        super();
        this.slider = this.querySelector('[id^="Slider-"]');
        this.sliderLength = this.slider.getAttribute('data-slider-products-to-show');

      new Swiper(this.slider, {
            slidesPerView: this.sliderLength,
            spaceBetween: 15,
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
          breakpoints: {
              320: {
                  slidesPerView: 1,
                  spaceBetween: 10
              },
              991: {
                  slidesPerView: this.sliderLength
              }
          }
        });


    }


}

customElements.define('slider-component', SliderComponent);

class SliderTestimonialsComponent extends HTMLElement {
    constructor() {
        super();
        this.slider = this.querySelector('[id^="Slider-"]');
        this.sliderLength = this.slider.getAttribute('data-slider-items-to-show');

        new Swiper(this.slider, {
            slidesPerView: this.sliderLength,
            spaceBetween: 15,
            keyboard: true,
            height: 100,
            navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
            },
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
            breakpoints: {
                320: {
                    slidesPerView: 1,
                    spaceBetween: 15
                },
                991: {
                    spaceBetween: 56,
                    slidesPerView: this.sliderLength
                }
            }
        });


    }


}

customElements.define('slider-testimonials-component', SliderTestimonialsComponent);