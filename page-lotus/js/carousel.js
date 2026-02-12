// Inicializar o primeiro carrossel (pratos)
new Splide('#pratos-carousel', {
  type: 'loop',
  perPage: 3,
  perMove: 1,
  gap: '20px',
  autoplay: true,
  interval: 3000,
  pauseOnHover: true,
  breakpoints: {
    768: {
      perPage: 2,
      gap: '15px'
    },
    480: {
      perPage: 1,
      gap: '10px'
    }
  }
}).mount();

// Inicializar o segundo carrossel (combinados)
new Splide('#combinados-carousel', {
  type: 'slide',
  perPage: 3,
  perMove: 1,
  gap: '25px',
  autoplay: true,
  interval: 3500,
  pauseOnHover: true,
  arrows: true,
  pagination: true,
  breakpoints: {
    1024: {
      perPage: 2,
      gap: '20px'
    },
    768: {
      perPage: 2,
      gap: '15px'
    },
    480: {
      perPage: 1,
      gap: '10px'
    }
  }
}).mount();