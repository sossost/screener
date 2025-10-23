import React from "react";
import { TurnAroundClient } from "./TurnAroundClient";

const TurnAroundPage = async () => {
  try {
    const data = await fetch(
      "http://localhost:3000/api/screener/turned-profitable",
      {
        next: {
          revalidate: 0,
        },
        cache: "no-store",
      }
    ).then((res) => res.json());

    console.log(data);

    return <TurnAroundClient data={data.companies} />;
  } catch (error) {
    console.error(error);
  }

  return <div>Error</div>;
};

export default TurnAroundPage;
