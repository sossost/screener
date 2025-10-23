import React from "react";
import { GoldenCrossClient } from "./GoldenCrossClient";

const GoldenCrossPage = async () => {
  try {
    const data = await fetch(
      "http://localhost:3000/api/screener/golden-cross",
      {
        next: {
          revalidate: 0,
        },
        cache: "no-store",
      }
    ).then((res) => res.json());

    return <GoldenCrossClient data={data.data} />;
  } catch (error) {
    console.error(error);
  }

  return <div>Error</div>;
};

export default GoldenCrossPage;
