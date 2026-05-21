<template>

  <!-- BOTÓN -->
  <div class="m-4">

    <button
      @click="toggleHelp"
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
    >
      {{ showhelp ? 'Cerrar ayuda' : 'Mostrar ayuda' }}
    </button>

  </div>

  <!-- MODAL -->
  <Teleport to="body">

    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >

      <!-- PANEL -->
      <div
        v-if="showhelp"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      >

        <!-- CAJA -->
        <div
          class="bg-gray-900 w-[1000px] max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-1000 shadow-2xl p-6"
        >

          <!-- HEADER -->
          <div class="flex flex-col gap-2 mb-6 border-b border-gray-700 pb-4">

            <button
                @click="toggleHelp"
                class="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>

            <h1 class="text-2xl font-bold text-blue-400">
                Panel de información
            </h1>

            
            <h2 class="text-gray-300 text-sm">
              Esta herramienta es un simulador de gestión de memoria para sistemas operativos, diseñado para ayudar a los estudiantes a comprender los conceptos fundamentales de la memoria virtual, paginación, segmentación y algoritmos de reemplazo de páginas.
            </h2>  

          </div>

          <!-- CONTENIDO -->
          <div class="flex flex-col gap-4">


              <button
                @click="toggleSection('Guia')"
                class="w-full text-left px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-t-lg focus:outline-none"
              >
                <span class="font-bold text-violet-400">
                  Guía del simulador
                </span>

                <span>
                  {{ openSection === 'Guia' ? '<' : '>' }}
                </span>

              </button>

              <div 
                v-if="openSection === 'Guia'"
                class="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-300">
                1. Elige la configuración: número de marcos fisicos, entrada TLB, algoritmo de reemplazo, número de penalizaciones TLB miss y page faults. <br>
                2. Agregue los procesos necesarios y los segmentos requeridos para cada proceso con su numero de páginas. <br>
                3. Pulsa iniciar simulación. <br>
                4. Elija el proceso, el segmento a ejecutar, la dirección de memoria en hexadecimal y los permisos de lectura o escritura. <br>
                5. Observe los resultados en el nivel de hardware, las métricas de rendimiento y el panel de pasos. <br>
                6. Repita el paso 4 para ejecutar otro proceso o pulse reiniciar simulación para comenzar de nuevo. <br><br>

                Recomendaciones: Activa el modo paso a paso para ver cada instrucción.

              </div>


            <div class="bg-gray-800 rounded-lg border border-gray-700">

                <button
                  @click="toggleSection('tlb')"
                  class="w-full text-left px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-t-lg focus:outline-none"
                  >

                  <span class="font-bold text-green-400">
                    ¿Qué es la TLB?
                  </span>

                  <span>
                    {{ openSection === 'tlb' ? '<' : '>' }}
                  </span>
                
                </button>
            
            </div>


            <div 
                v-if="openSection === 'tlb'"
                class="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-300">
                El TLB es una memoria caché pequeña y extremadamente rápida ubicada dentro de la MMU. <br>
                Almacena las traducciones de direcciones más recientes — pares VPN → marco físico — para no tener que consultar la tabla de páginas en cada acceso. Su tamaño típico es de 64 a 1024 entradas.

                
            </div>

            <div class="bg-gray-800 rounded-lg border border-gray-700">

                <button
                  @click="toggleSection('paginación')"
                  class="w-full text-left px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-t-lg focus:outline-none"
                  >

                  <span class="font-bold text-green-400">
                    ¿Qué es la paginación?
                  </span>

                  <span>
                    {{ openSection === 'paginación' ? '<' : '>' }}
                  </span>
                
                </button>
            
            </div>


            <div 
                v-if="openSection === 'paginación'"
                class="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-300">
                La paginación es una técnica de gestión de memoria que divide la memoria principal en bloques fijos llamados marcos. 
                Cada proceso utiliza una dirección lógica que se divide en una parte para el número de página y otra para el desplazamiento dentro de la página. 
                Esta técnica permite un mejor uso de la memoria y facilita el intercambio de páginas entre la memoria principal y el disco.

            </div>

            <div class="bg-gray-800 rounded-lg border border-gray-700">

                <button
                  @click="toggleSection('segmentation')"
                  class="w-full text-left px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-t-lg focus:outline-none"
                  >

                  <span class="font-bold text-green-400">
                    ¿Qué es la segmentación?
                  </span>

                  <span>
                    {{ openSection === 'segmentation' ? '<' : '>' }}
                  </span>
                
                </button>
            
            </div>


            <div 
                v-if="openSection === 'segmentation'"
                class="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-300">
                La segmentación es una técnica de gestión de memoria que divide la memoria principal en bloques de tamaños variables llamados segmentos. 
                Cada proceso utiliza una dirección lógica que se divide en una parte para el número de segmento y otra para el desplazamiento dentro del segmento. 
                Esta técnica permite un mejor uso de la memoria y facilita el intercambio de segmentos entre la memoria principal y el disco.

            </div>

            <div class="bg-gray-800 rounded-lg border border-gray-700">

                <button
                  @click="toggleSection('memoria fisica')"
                  class="w-full text-left px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-t-lg focus:outline-none"
                  >

                  <span class="font-bold text-green-400">
                    ¿Qué es la memoria física?
                  </span>

                  <span>
                    {{ openSection === 'memoria fisica' ? '<' : '>' }}
                  </span>
                
                </button>
            
            </div>


            <div 
                v-if="openSection === 'memoria fisica'"
                class="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-300">
                La memoria física es la memoria real instalada en el sistema, accesible directamente por la unidad de procesamiento. 
                Es donde se almacenan temporalmente los datos y programas que están siendo utilizados por el sistema.

            </div>

            <div class="bg-gray-800 rounded-lg border border-gray-700">

                <button
                  @click="toggleSection('memoria virtual')"
                  class="w-full text-left px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-t-lg focus:outline-none"
                  >

                  <span class="font-bold text-green-400">
                    ¿Qué es la memoria virtual?
                  </span>

                  <span>
                    {{ openSection === 'memoria virtual' ? '<' : '>' }}
                  </span>
                
                </button>
            
            </div>

             <div class="bg-gray-800 rounded-lg border border-gray-700">

                <button
                  @click="toggleSection('fifo')"
                  class="w-full text-left px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-t-lg focus:outline-none"
                  >

                  <span class="font-bold text-green-400">
                    ¿Qué es el algoritmo FIFO?
                  </span>

                  <span>
                    {{ openSection === 'fifo' ? '<' : '>' }}
                  </span>
                
                </button>
            
            </div>


            <div 
                v-if="openSection === 'fifo'"
                class="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-300">
                El algoritmo FIFO (First-In, First-Out) es una técnica de reemplazo de páginas que selecciona como víctima la página que lleva más tiempo en la memoria principal. 
                Este algoritmo es simple de implementar pero puede sufrir el problema de Belady.

            </div>

             <div class="bg-gray-800 rounded-lg border border-gray-700">

                <button
                  @click="toggleSection('lru')"
                  class="w-full text-left px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-t-lg focus:outline-none"
                  >

                  <span class="font-bold text-green-400">
                    ¿Qué es el algoritmo LRU?
                  </span>

                  <span>
                    {{ openSection === 'lru' ? '<' : '>' }}
                  </span>
                
                </button>
            
            </div>


            <div 
                v-if="openSection === 'lru'"
                class="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-300">
                El algoritmo LRU (Least Recently Used) es una técnica de reemplazo de páginas que selecciona como víctima la página que lleva más tiempo sin ser accedida. 
                Este algoritmo es más complejo de implementar pero suele ofrecer un mejor rendimiento que FIFO.

            </div>


            <div class="bg-gray-800 rounded-lg border border-gray-700">

                <button
                  @click="toggleSection('Page fault')"
                  class="w-full text-left px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-t-lg focus:outline-none"
                  >

                  <span class="font-bold text-green-400">
                    ¿Qué es un Page Fault?
                  </span>

                  <span>
                    {{ openSection === 'Page fault' ? '<' : '>' }}
                  </span>
                
                </button>
            
            </div>


            <div 
                v-if="openSection === 'Page fault'"
                class="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-300">
                Un Page Fault ocurre cuando un proceso intenta acceder a una página de memoria que no está actualmente en la memoria física. 
                El sistema operativo debe cargar esa página desde el disco y actualizar las tablas de páginas para permitir el acceso al proceso.

            </div>

          </div>

        </div>

      </div>

    </Transition>

  </Teleport>

</template>

<script setup>
import { ref } from 'vue'

const showhelp = ref(false)
const openSection = ref(null)

function toggleSection(section) {
  if  (openSection.value === section) {
    openSection.value = null
  } else {
    openSection.value = section
  }
}

function toggleHelp() {
  showhelp.value = !showhelp.value
}
</script>