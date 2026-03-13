'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

import { DB } from '@/lib/state'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444']

export default function DashboardPage() {

  const bunuri = DB.inventar || []
  const cladiri = DB.cladiri || []
  const tasks = DB.tasks || []
  const activities = DB.activities || []

  const valoareTotala = bunuri.reduce((s, b) => s + (b.val || 0), 0)

  const chartCladiri = useMemo(() => {
    return cladiri.map(c => {
      const bunuriCladire = bunuri.filter(b => b.cladireId === c.id)

      const total = bunuriCladire.reduce(
        (s, b) => s + (b.val || 0),
        0
      )

      return {
        name: c.cod,
        valoare: total
      }
    })
  }, [bunuri, cladiri])


  const chartCategorii = useMemo(() => {

    const map: any = {}

    bunuri.forEach(b => {
      const cat = b.cat || 'Altele'

      if (!map[cat]) map[cat] = 0

      map[cat] += b.val || 0
    })

    return Object.keys(map).map(k => ({
      name: k,
      value: map[k]
    }))

  }, [bunuri])


  const mentenantaUrgenta = tasks
    .filter(t => t.status !== 'finalizat')
    .slice(0, 6)


  const activitateRecenta = activities
    .slice()
    .reverse()
    .slice(0, 8)


  return (
    <div className="space-y-6">

      {/* KPI */}

      <div className="grid grid-cols-4 gap-4">

        <StatBox title="Bunuri" value={bunuri.length} />

        <StatBox title="Cladiri" value={cladiri.length} />

        <StatBox
          title="Valoare patrimoniu"
          value={`${valoareTotala.toLocaleString('ro-RO')} RON`}
        />

        <StatBox
          title="Mentenanta activa"
          value={mentenantaUrgenta.length}
        />

      </div>



      {/* GRAFICE */}

      <div className="grid grid-cols-2 gap-6">

        <div className="card">

          <div className="card-header">
            <span className="card-title">
              Valoare patrimoniu pe cladiri
            </span>
          </div>

          <div className="p-4 h-[300px]">

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartCladiri}>

                <XAxis dataKey="name" />
                <YAxis />

                <Tooltip />

                <Bar dataKey="valoare" fill="#2563eb" />

              </BarChart>
            </ResponsiveContainer>

          </div>

        </div>


        <div className="card">

          <div className="card-header">
            <span className="card-title">
              Structura patrimoniu
            </span>
          </div>

          <div className="p-4 h-[300px]">

            <ResponsiveContainer width="100%" height="100%">

              <PieChart>

                <Pie
                  data={chartCategorii}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                >

                  {chartCategorii.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}

                </Pie>

                <Tooltip />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>



      {/* ALERTA MENTENANTA + ACTIVITATE */}

      <div className="grid grid-cols-2 gap-6">

        <div className="card">

          <div className="card-header">
            <span className="card-title">
              Alerte mentenanta
            </span>
          </div>

          <table className="table">

            <thead>
              <tr>
                <th>Titlu</th>
                <th>Prioritate</th>
                <th>Termen</th>
              </tr>
            </thead>

            <tbody>

              {mentenantaUrgenta.map((t: any) => (

                <tr key={t.id}>

                  <td>{t.titlu}</td>

                  <td>{t.prioritate}</td>

                  <td>{t.termen}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>



        <div className="card">

          <div className="card-header">
            <span className="card-title">
              Activitate recenta
            </span>
          </div>

          <ul className="p-4 space-y-2">

            {activitateRecenta.map((a: any, i: number) => (

              <li
                key={i}
                className="flex justify-between text-sm"
              >

                <span>{a.msg}</span>

                <span className="text-gray-400">
                  {a.time}
                </span>

              </li>

            ))}

          </ul>

        </div>

      </div>



      {/* TABEL BUNURI */}

      <div className="card">

        <div className="card-header flex justify-between">

          <span className="card-title">
            Bunuri inventariate
          </span>

          <button
            className="btn"
            onClick={() => console.log('open bun modal')}
          >
            Adauga bun nou
          </button>

        </div>


        <table className="table">

          <thead>

            <tr>
              <th>Nr Inv</th>
              <th>Denumire</th>
              <th>Categorie</th>
              <th>Valoare</th>
              <th>Stare</th>
            </tr>

          </thead>


          <tbody>

            {bunuri.slice(0, 20).map((b: any) => (

              <tr key={b.id}>

                <td>{b.nrInv}</td>

                <td>{b.nume}</td>

                <td>{b.cat}</td>

                <td>
                  {(b.val || 0).toLocaleString('ro-RO')} RON
                </td>

                <td>{b.stare}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}



function StatBox({
  title,
  value
}: {
  title: string
  value: any
}) {

  return (
    <div className="card p-4 text-center">

      <div className="text-2xl font-bold">
        {value}
      </div>

      <div className="text-sm text-gray-500">
        {title}
      </div>

    </div>
  )
}