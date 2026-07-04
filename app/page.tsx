"use client"

export default function Home() {
  return (
    <div className="relative bg-white h-screen">
      <hr className="absolute border-gray-200 w-full top-[10vmin] left-0 -translate-y-1/2" />

      <div className="absolute top-0 left-[10vmin] right-[10vmin] h-[10vmin] flex items-center">
        <p>Logo Here</p>
      </div>
     
      <hr className="absolute border-gray-200 w-full bottom-[10vmin] left-0 translate-y-1/2" />

      <div className="absolute inset-[10vmin] flex items-center justify-center flex">
      
        <div className=" bg-black w-[30em] h-full">


        </div>

        <p>Like Image</p>
      </div>

      <div className="absolute border-l border-gray-200 h-full top-0 left-[10vmin] -translate-x-1/2" />
      <div className="absolute border-l border-gray-200 h-full top-0 right-[10vmin] translate-x-1/2" />
    </div>
  );
}
