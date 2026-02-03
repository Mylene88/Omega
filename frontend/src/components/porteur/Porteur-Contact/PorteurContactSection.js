/* // src/components/porteur/Porteur-Contact/PorteurContactSection.js
import { useId } from 'react';
import Collapsible from '../../common/Collapsible/Collapsible';

const TYPES_PORTEUR = [
    'Etat',
    'Etablissement public',
    'Etablissement privé',
    'Collectivité',
    'Association',
    'Autre',
];

export default function PorteurContactSection({
                                                  value = {},
                                                  onChange,
                                                  types = TYPES_PORTEUR,
                                                  title = 'Porteur et contacts',
                                              }) {
    const idType = useId();
    const idStructure = useId();
    const idReferent = useId();
    const idFonction = useId();
    const idEmail = useId();
    const idTelephone = useId();

    const v = {
        typePorteur: value.typePorteur || '',
        structure: value.structure || '',
        referent: value.referent || '',
        fonctionReferent: value.fonctionReferent || '',
        emailReferent: value.emailReferent || '',
        telephoneReferent: value.telephoneReferent || '',
    };

    const setField = (k, val) => onChange?.({ ...v, [k]: val });

    return (
        <Collapsible title={title} defaultOpen className="max-w-md">
            <div className="space-y-6">
//                 {/* Type de porteur */
//                 <div className="space-y-3">
//                     <p className="text-sm font-semibold text-slate-700">Type de porteur</p>

//                     <div className="grid grid-cols-1 gap-3">
//                         {types.map((label) => (
//                             <label
//                                 key={label}
//                                 htmlFor={`${idType}-${label}`}
//                                 className="inline-flex items-center gap-3"
//                             >
//                                 <input
//                                     id={`${idType}-${label}`}
//                                     type="radio"
//                                     name={`${idType}-group`}
//                                     checked={v.typePorteur === label}
//                                     onChange={() => setField('typePorteur', label)}
//                                     className="h-5 w-5 appearance-none rounded-full border-2 border-slate-400 checked:border-blue-600 checked:bg-blue-600 transition-colors"
//                                 />
//                                 <span className="text-slate-700">{label}</span>
//                             </label>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Porteur de projet */}
//                 <div className="space-y-2">
//                     <label htmlFor={idStructure} className="text-sm font-semibold text-slate-700">
//                         Porteur de projet
//                     </label>
//                     <input
//                         id={idStructure}
//                         type="text"
//                         value={v.structure}
//                         onChange={(e) => setField('structure', e.target.value)}
//                         placeholder="Nom ou acronyme de la structure"
//                         className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
//                     />
//                 </div>

//                 {/* Référent */}
//                 <div className="space-y-2">
//                     <label htmlFor={idReferent} className="text-sm font-semibold text-slate-700">
//                         Référent
//                     </label>
//                     <input
//                         id={idReferent}
//                         type="text"
//                         value={v.referent}
//                         onChange={(e) => setField('referent', e.target.value)}
//                         placeholder="Nom et prénom du référent"
//                         className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
//                     />
//                 </div>

//                 {/* Fonction du référent */}
//                 <div className="space-y-2">
//                     <label htmlFor={idFonction} className="text-sm font-semibold text-slate-700">
//                         Fonction du référent
//                     </label>
//                     <input
//                         id={idFonction}
//                         type="text"
//                         value={v.fonctionReferent}
//                         onChange={(e) => setField('fonctionReferent', e.target.value)}
//                         placeholder="Fonction du référent"
//                         className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
//                     />
//                 </div>

//                 {/* Email référent */}
//                 <div className="space-y-2">
//                     <label htmlFor={idEmail} className="text-sm font-semibold text-slate-700">
//                         Email référent
//                     </label>
//                     <input
//                         id={idEmail}
//                         type="email"
//                         value={v.emailReferent}
//                         onChange={(e) => setField('emailReferent', e.target.value)}
//                         placeholder="Email du référent"
//                         className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
//                     />
//                 </div>

//                 {/* Téléphone référent */}
//                 <div className="space-y-2">
//                     <label htmlFor={idTelephone} className="text-sm font-semibold text-slate-700">
//                         Téléphone référent
//                     </label>
//                     <input
//                         id={idTelephone}
//                         type="tel"
//                         value={v.telephoneReferent}
//                         onChange={(e) => setField('telephoneReferent', e.target.value)}
//                         placeholder="Contact du référent"
//                         className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
//                     />
//                 </div>
//             </div>
//         </Collapsible>
//     );
// }
//  */